import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { requireCapability, type AuthenticatedActor } from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import {
  inventoryLocations,
  inventoryMovements,
  openingStockLines,
  openingStockSubmissions,
  products,
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
import { validateLocationDate } from '../shared/business-date.js';
import {
  reclassifyStockInputSchema,
  type ReclassifyStockInput,
} from './application/stock-classification-input.js';

@Injectable()
export class StockClassificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async reclassify(actor: AuthenticatedActor, key: string | undefined, rawInput: unknown) {
    requireCapability(actor, 'RECLASSIFY_STOCK');
    const parsed = reclassifyStockInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_RECLASSIFICATION_INPUT',
        issues: parsed.error.issues,
      });
    }
    return this.idempotency.execute(actor.userId, 'stock.reclassify', key, parsed.data, (tx) =>
      this.persist(tx, actor, parsed.data),
    );
  }

  private async persist(
    tx: DatabaseTransaction,
    actor: AuthenticatedActor,
    input: ReclassifyStockInput,
  ) {
    if (input.freshProductId === input.discountedProductId) {
      throw new BadRequestException('Fresh and discounted products must differ.');
    }
    const [location] = await tx
      .select({
        shopId: inventoryLocations.shopId,
        locationType: inventoryLocations.locationType,
      })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.id, input.locationId));
    if (!location) throw new NotFoundException('Inventory location was not found.');
    if (location.shopId === null) {
      if (actor.role !== 'ADMIN' && !actor.role.startsWith('HUB_')) {
        throw new NotFoundException('Inventory location was not found.');
      }
    } else {
      requireRecordShopAccess(actor, { shopId: location.shopId });
    }
    await validateLocationDate(tx, location.shopId, input.businessDate, input.occurredAt);
    const productRows = await tx
      .select({
        id: products.id,
        stockClass: products.stockClass,
        freshProductId: products.freshProductId,
      })
      .from(products)
      .where(
        and(
          eq(products.active, true),
          inArray(products.id, [input.freshProductId, input.discountedProductId]),
        ),
      );
    const fresh = productRows.find((row) => row.id === input.freshProductId);
    const discounted = productRows.find((row) => row.id === input.discountedProductId);
    if (!fresh || !discounted)
      throw new NotFoundException('Fresh or discounted product was not found.');
    if (
      fresh.stockClass !== 'FRESH' ||
      discounted.stockClass !== 'DISCOUNTED' ||
      discounted.freshProductId !== fresh.id
    ) {
      throw new BadRequestException(
        'The discounted product must be linked to the selected fresh product.',
      );
    }
    for (const productId of [input.freshProductId, input.discountedProductId].sort()) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${input.locationId}:${productId}:${input.businessDate}`}, 0))`,
      );
    }
    const [submission] = await tx
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, input.locationId),
          eq(openingStockSubmissions.businessDate, input.businessDate),
        ),
      );
    if (!submission && location.locationType === 'SHOP')
      throw new ConflictException('Opening stock has not been submitted for this business date.');
    const [opening, movements] = await Promise.all([
      submission
        ? tx
            .select({ quantityGrams: openingStockLines.quantityGrams })
            .from(openingStockLines)
            .where(
              and(
                eq(openingStockLines.submissionId, submission.id),
                eq(openingStockLines.productId, input.freshProductId),
              ),
            )
        : Promise.resolve([]),
      tx
        .select({ quantityGrams: inventoryMovements.quantityGrams })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.locationId, input.locationId),
            eq(inventoryMovements.productId, input.freshProductId),
            location.locationType === 'CENTRAL'
              ? lte(inventoryMovements.businessDate, input.businessDate)
              : eq(inventoryMovements.businessDate, input.businessDate),
          ),
        ),
    ]);
    try {
      requireSufficientInventory(
        calculateAvailableGrams(
          opening[0]?.quantityGrams ?? 0n,
          movements.map((row) => ({ quantityGrams: row.quantityGrams })),
        ),
        input.quantityGrams,
      );
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        throw new ConflictException({ code: 'INSUFFICIENT_FRESH_STOCK', message: error.message });
      }
      throw error;
    }
    const id = randomUUID();
    await tx.insert(inventoryMovements).values([
      {
        id: randomUUID(),
        locationId: input.locationId,
        productId: input.freshProductId,
        businessDate: input.businessDate,
        movementType: 'RECLASSIFICATION_OUT',
        quantityGrams: -input.quantityGrams,
        sourceType: 'STOCK_RECLASSIFICATION',
        sourceId: id,
        occurredAt: input.occurredAt,
        createdByUserId: actor.userId,
      },
      {
        id: randomUUID(),
        locationId: input.locationId,
        productId: input.discountedProductId,
        businessDate: input.businessDate,
        movementType: 'RECLASSIFICATION_IN',
        quantityGrams: input.quantityGrams,
        sourceType: 'STOCK_RECLASSIFICATION',
        sourceId: id,
        occurredAt: input.occurredAt,
        createdByUserId: actor.userId,
      },
    ]);
    return { id, quantityGrams: input.quantityGrams.toString() };
  }
}
