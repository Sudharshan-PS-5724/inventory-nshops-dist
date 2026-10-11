import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import {
  inventoryLocations,
  inventoryMovements,
  openingStockLines,
  openingStockSubmissions,
  stockTransfers,
  transferItems,
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
import {
  createTransferInputSchema,
  type CreateTransferInput,
} from './application/transfer-input.js';
import { sortedTransferLockKeys } from './domain/transfer-locks.js';

@Injectable()
export class TransfersService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async create(actor: AuthenticatedActor, idempotencyKey: string | undefined, rawInput: unknown) {
    requireAdministrator(actor);
    const parsed = createTransferInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_TRANSFER_INPUT',
        issues: parsed.error.issues,
      });
    }
    return this.idempotencyService.execute(
      actor.userId,
      'transfers.create',
      idempotencyKey,
      parsed.data,
      (transaction) => this.persistTransfer(transaction, actor.userId, parsed.data),
    );
  }

  private async persistTransfer(
    transaction: DatabaseTransaction,
    userId: string,
    input: CreateTransferInput,
  ) {
    const transferId = randomUUID();
    const now = new Date();

    const locations = await transaction
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .where(
        sql`${inventoryLocations.id} in (${input.sourceLocationId}, ${input.destinationLocationId})`,
      );
    if (locations.length !== 2) {
      throw new NotFoundException('Transfer source or destination location was not found.');
    }

    const lockKeys = sortedTransferLockKeys(
      input.items.map((item) => ({
        locationId: input.sourceLocationId,
        productId: item.productId,
        businessDate: input.businessDate,
      })),
    );
    for (const lockKey of lockKeys) {
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
    }

    for (const item of input.items) {
      await this.assertSufficientSourceInventory(
        transaction,
        input.sourceLocationId,
        input.businessDate,
        item.productId,
        item.quantityGrams,
      );
    }

    await transaction.insert(stockTransfers).values({
      id: transferId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: input.destinationLocationId,
      initiatedByUserId: userId,
      notes: input.notes,
      confirmedAt: now,
    });

    const itemRows = input.items.map((item) => ({
      id: randomUUID(),
      transferId,
      productId: item.productId,
      quantityGrams: item.quantityGrams,
    }));
    await transaction.insert(transferItems).values(itemRows);

    await transaction.insert(inventoryMovements).values(
      itemRows.flatMap((item) => [
        {
          id: randomUUID(),
          locationId: input.sourceLocationId,
          productId: item.productId,
          businessDate: input.businessDate,
          movementType: 'TRANSFER_OUT' as const,
          quantityGrams: -item.quantityGrams,
          sourceType: 'TRANSFER',
          sourceId: item.id,
          occurredAt: now,
          createdByUserId: userId,
        },
        {
          id: randomUUID(),
          locationId: input.destinationLocationId,
          productId: item.productId,
          businessDate: input.businessDate,
          movementType: 'TRANSFER_IN' as const,
          quantityGrams: item.quantityGrams,
          sourceType: 'TRANSFER',
          sourceId: item.id,
          occurredAt: now,
          createdByUserId: userId,
        },
      ]),
    );

    return { id: transferId, confirmedAt: now, itemCount: itemRows.length };
  }

  private async assertSufficientSourceInventory(
    transaction: DatabaseTransaction,
    locationId: string,
    businessDate: string,
    productId: string,
    requestedGrams: bigint,
  ): Promise<void> {
    const [submission] = await transaction
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, locationId),
          eq(openingStockSubmissions.businessDate, businessDate),
        ),
      );
    if (submission === undefined) {
      throw new ConflictException(
        'Source opening stock has not been submitted for this business date.',
      );
    }

    const [openingLine] = await transaction
      .select({ quantityGrams: openingStockLines.quantityGrams })
      .from(openingStockLines)
      .where(
        and(
          eq(openingStockLines.submissionId, submission.id),
          eq(openingStockLines.productId, productId),
        ),
      );
    const movements = await transaction
      .select({ quantityGrams: inventoryMovements.quantityGrams })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.locationId, locationId),
          eq(inventoryMovements.productId, productId),
          eq(inventoryMovements.businessDate, businessDate),
        ),
      );

    try {
      requireSufficientInventory(
        calculateAvailableGrams(
          openingLine?.quantityGrams ?? 0n,
          movements.map((movement) => ({ quantityGrams: movement.quantityGrams })),
        ),
        requestedGrams,
      );
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: error.message });
      }
      throw error;
    }
  }
}
