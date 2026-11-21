import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { validateLocationDate } from '../shared/business-date.js';
import { requireCapability, type AuthenticatedActor } from '../access/domain/access-policy.js';
import {
  inventoryLocations,
  inventoryMovements,
  openingStockLines,
  openingStockSubmissions,
  products,
  wastageRecords,
} from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import {
  calculateAvailableGrams,
  InsufficientInventoryError,
  requireSufficientInventory,
} from '../inventory/domain/inventory-accounting.js';
import { requireRecordShopAccess } from '../shops/domain/shop-scope.js';
import {
  recordWastageInputSchema,
  type RecordWastageInput,
} from './application/record-wastage-input.js';

@Injectable()
export class WastageService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async record(actor: AuthenticatedActor, idempotencyKey: string | undefined, rawInput: unknown) {
    requireCapability(actor, 'RECORD_WASTAGE');
    const parsed = recordWastageInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_WASTAGE_INPUT', issues: parsed.error.issues });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'wastage.record',
      idempotencyKey,
      parsed.data,
      (transaction) => this.persistRecord(transaction, actor, parsed.data),
    );
  }

  private async persistRecord(
    transaction: DatabaseTransaction,
    actor: AuthenticatedActor,
    input: RecordWastageInput,
  ) {
    const [location, product] = await Promise.all([
      transaction
        .select({
          shopId: inventoryLocations.shopId,
          locationType: inventoryLocations.locationType,
        })
        .from(inventoryLocations)
        .where(eq(inventoryLocations.id, input.locationId))
        .then(([row]) => row),
      transaction
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.active, true)))
        .then(([row]) => row),
    ]);
    if (location === undefined) {
      throw new NotFoundException('Inventory location was not found.');
    }
    if (location.shopId === null) {
      if (actor.role !== 'ADMIN') {
        throw new NotFoundException('Inventory location was not found.');
      }
    } else {
      requireRecordShopAccess(actor, { shopId: location.shopId });
    }
    if (product === undefined) {
      throw new NotFoundException('Active product was not found.');
    }

    await validateLocationDate(transaction, location.shopId, input.businessDate, input.occurredAt);
    const lockKey = `${input.locationId}:${input.productId}:${input.businessDate}`;
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
    await this.assertSufficientInventory(transaction, input, location.locationType);

    const id = randomUUID();
    await transaction.insert(wastageRecords).values({
      id,
      locationId: input.locationId,
      productId: input.productId,
      quantityGrams: input.quantityGrams,
      occurredAt: input.occurredAt,
      reason: input.reason,
      recordedByUserId: actor.userId,
    });
    await transaction.insert(inventoryMovements).values({
      id: randomUUID(),
      locationId: input.locationId,
      productId: input.productId,
      businessDate: input.businessDate,
      movementType: 'WASTAGE',
      quantityGrams: -input.quantityGrams,
      sourceType: 'WASTAGE',
      sourceId: id,
      occurredAt: input.occurredAt,
      createdByUserId: actor.userId,
    });
    return { id, occurredAt: input.occurredAt, quantityGrams: input.quantityGrams.toString() };
  }

  private async assertSufficientInventory(
    transaction: DatabaseTransaction,
    input: RecordWastageInput,
    locationType: 'CENTRAL' | 'SHOP',
  ): Promise<void> {
    const [submission] = await transaction
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, input.locationId),
          eq(openingStockSubmissions.businessDate, input.businessDate),
        ),
      );
    if (submission === undefined && locationType === 'SHOP') {
      throw new ConflictException('Opening stock has not been submitted for this business date.');
    }
    const openingLine = submission
      ? await transaction
          .select({ quantityGrams: openingStockLines.quantityGrams })
          .from(openingStockLines)
          .where(
            and(
              eq(openingStockLines.submissionId, submission.id),
              eq(openingStockLines.productId, input.productId),
            ),
          )
          .then(([row]) => row)
      : undefined;
    const movements = await transaction
      .select({ quantityGrams: inventoryMovements.quantityGrams })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.locationId, input.locationId),
          eq(inventoryMovements.productId, input.productId),
          locationType === 'CENTRAL'
            ? lte(inventoryMovements.businessDate, input.businessDate)
            : eq(inventoryMovements.businessDate, input.businessDate),
        ),
      );
    try {
      requireSufficientInventory(
        calculateAvailableGrams(
          openingLine?.quantityGrams ?? 0n,
          movements.map((movement) => ({ quantityGrams: movement.quantityGrams })),
        ),
        input.quantityGrams,
      );
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: error.message });
      }
      throw error;
    }
  }
}
