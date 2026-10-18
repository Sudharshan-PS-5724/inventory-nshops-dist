import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { validateLocationDate } from '../shared/business-date.js';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import {
  inventoryLocations,
  inventoryMovements,
  openingStockLines,
  openingStockSubmissions,
  productPrices,
  products,
  saleItems,
  sales,
} from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import {
  calculateAvailableGrams,
  calculateRecoveryPricePaisePerKg,
  InsufficientInventoryError,
  requireSufficientInventory,
} from '../inventory/domain/inventory-accounting.js';
import { requireRecordShopAccess } from '../shops/domain/shop-scope.js';
import {
  recordRecoverySaleInputSchema,
  type RecordRecoverySaleInput,
} from './application/record-recovery-sale-input.js';

@Injectable()
export class RecoverySalesService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async record(actor: AuthenticatedActor, key: string | undefined, rawInput: unknown) {
    const parsed = recordRecoverySaleInputSchema.safeParse(rawInput);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'INVALID_RECOVERY_SALE_INPUT',
        issues: parsed.error.issues,
      });
    return this.idempotencyService.execute(
      actor.userId,
      'recovery-sales.record',
      key,
      parsed.data,
      (tx) => this.persist(tx, actor, parsed.data),
    );
  }

  private async persist(
    tx: DatabaseTransaction,
    actor: AuthenticatedActor,
    input: RecordRecoverySaleInput,
  ) {
    const [location] = await tx
      .select({ shopId: inventoryLocations.shopId })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.id, input.locationId));
    if (!location) throw new NotFoundException('Inventory location was not found.');
    if (location.shopId === null) {
      if (actor.role !== 'ADMIN') throw new NotFoundException('Inventory location was not found.');
    } else requireRecordShopAccess(actor, { shopId: location.shopId });

    await validateLocationDate(tx, location.shopId, input.businessDate, input.soldAt);
    const productRows = await tx
      .select({ id: products.id, recoveryBasisPoints: products.recoveryBasisPoints })
      .from(products)
      .where(
        and(
          inArray(
            products.id,
            input.items.map((item) => item.productId),
          ),
          eq(products.active, true),
        ),
      );
    if (productRows.length !== input.items.length)
      throw new NotFoundException('One or more active products were not found.');
    const productsById = new Map(productRows.map((product) => [product.id, product]));
    for (const item of [...input.items].sort((left, right) =>
      left.productId.localeCompare(right.productId),
    ))
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${input.locationId}:${item.productId}:${input.businessDate}`}, 0))`,
      );

    const [submission] = await tx
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, input.locationId),
          eq(openingStockSubmissions.businessDate, input.businessDate),
        ),
      );
    if (!submission)
      throw new ConflictException('Opening stock has not been submitted for this business date.');
    const saleId = randomUUID();
    const rows: {
      id: string;
      productId: string;
      quantityGrams: bigint;
      normalPricePaisePerKg: bigint;
      recoveryBasisPoints: number;
      unitPricePaisePerKg: bigint;
      lineAmountPaise: bigint;
    }[] = [];
    for (const item of input.items) {
      const [opening, movements, price] = await Promise.all([
        tx
          .select({ quantityGrams: openingStockLines.quantityGrams })
          .from(openingStockLines)
          .where(
            and(
              eq(openingStockLines.submissionId, submission.id),
              eq(openingStockLines.productId, item.productId),
            ),
          ),
        tx
          .select({ quantityGrams: inventoryMovements.quantityGrams })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.locationId, input.locationId),
              eq(inventoryMovements.productId, item.productId),
              eq(inventoryMovements.businessDate, input.businessDate),
            ),
          ),
        tx
          .select({ paisePerKg: productPrices.paisePerKg })
          .from(productPrices)
          .where(
            and(
              eq(productPrices.productId, item.productId),
              lte(productPrices.effectiveFrom, input.soldAt),
            ),
          )
          .orderBy(desc(productPrices.effectiveFrom))
          .limit(1),
      ]);
      const product = productsById.get(item.productId)!;
      if (!price[0])
        throw new ConflictException(
          'No effective selling price exists for a recovery-sale product.',
        );
      try {
        requireSufficientInventory(
          calculateAvailableGrams(
            opening[0]?.quantityGrams ?? 0n,
            movements.map((movement) => ({ quantityGrams: movement.quantityGrams })),
          ),
          item.quantityGrams,
        );
      } catch (error) {
        if (error instanceof InsufficientInventoryError)
          throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: error.message });
        throw error;
      }
      const recoveryPrice = calculateRecoveryPricePaisePerKg(
        price[0].paisePerKg,
        product.recoveryBasisPoints,
      );
      rows.push({
        id: randomUUID(),
        productId: item.productId,
        quantityGrams: item.quantityGrams,
        normalPricePaisePerKg: price[0].paisePerKg,
        recoveryBasisPoints: product.recoveryBasisPoints,
        unitPricePaisePerKg: recoveryPrice,
        lineAmountPaise: (item.quantityGrams * recoveryPrice + 500n) / 1000n,
      });
    }
    await tx.insert(sales).values({
      id: saleId,
      locationId: input.locationId,
      classification: 'RECOVERY',
      soldAt: input.soldAt,
      paymentMode: input.paymentMode,
      createdByUserId: actor.userId,
    });
    await tx.insert(saleItems).values(rows.map((row) => ({ ...row, saleId })));
    await tx.insert(inventoryMovements).values(
      rows.map((row) => ({
        id: randomUUID(),
        locationId: input.locationId,
        productId: row.productId,
        businessDate: input.businessDate,
        movementType: 'RECOVERY_SALE' as const,
        quantityGrams: -row.quantityGrams,
        sourceType: 'RECOVERY_SALE',
        sourceId: row.id,
        occurredAt: input.soldAt,
        createdByUserId: actor.userId,
      })),
    );
    return {
      id: saleId,
      soldAt: input.soldAt,
      itemCount: rows.length,
      totalAmountPaise: rows.reduce((total, row) => total + row.lineAmountPaise, 0n).toString(),
    };
  }
}
