import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import {
  inventoryLocations,
  inventoryMovements,
  products,
  purchaseItems,
  purchases,
  suppliers,
} from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import {
  createPurchaseInputSchema,
  type CreatePurchaseInput,
} from './application/create-purchase-input.js';
import {
  createSupplierInputSchema,
  type CreateSupplierInput,
} from './application/create-supplier-input.js';
import { calculatePurchaseLineAmountPaise } from './domain/purchase-accounting.js';

@Injectable()
export class PurchasesService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async createSupplier(
    actor: AuthenticatedActor,
    idempotencyKey: string | undefined,
    rawInput: unknown,
  ) {
    requireAdministrator(actor);
    const parsed = createSupplierInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_SUPPLIER_INPUT',
        issues: parsed.error.issues,
      });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'suppliers.create',
      idempotencyKey,
      parsed.data,
      (transaction) => this.persistSupplier(transaction, parsed.data),
    );
  }

  async createPurchase(
    actor: AuthenticatedActor,
    idempotencyKey: string | undefined,
    rawInput: unknown,
  ) {
    requireAdministrator(actor);
    const parsed = createPurchaseInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_PURCHASE_INPUT',
        issues: parsed.error.issues,
      });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'purchases.create',
      idempotencyKey,
      parsed.data,
      (transaction) => this.persistPurchase(transaction, actor.userId, parsed.data),
    );
  }

  private async persistSupplier(transaction: DatabaseTransaction, input: CreateSupplierInput) {
    const id = randomUUID();
    const [supplier] = await transaction
      .insert(suppliers)
      .values({ id, name: input.name, phone: input.phone })
      .returning();
    if (supplier === undefined) {
      throw new Error('Supplier creation did not return a persisted supplier.');
    }
    return supplier;
  }

  private async persistPurchase(
    transaction: DatabaseTransaction,
    recordedByUserId: string,
    input: CreatePurchaseInput,
  ) {
    const [supplier, receivingLocation] = await Promise.all([
      transaction
        .select({ id: suppliers.id, active: suppliers.active })
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId))
        .then(([row]) => row),
      transaction
        .select({ id: inventoryLocations.id, locationType: inventoryLocations.locationType })
        .from(inventoryLocations)
        .where(eq(inventoryLocations.id, input.receivingLocationId))
        .then(([row]) => row),
    ]);
    if (supplier === undefined || !supplier.active) {
      throw new NotFoundException('Active supplier was not found.');
    }
    if (receivingLocation === undefined || receivingLocation.locationType !== 'CENTRAL') {
      throw new BadRequestException(
        'Purchases must be received into the central inventory location.',
      );
    }

    const matchingProducts = await transaction
      .select({ id: products.id })
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
    if (matchingProducts.length !== input.items.length) {
      throw new NotFoundException('One or more active purchase products were not found.');
    }

    const purchaseId = randomUUID();
    const confirmedAt = new Date();
    await transaction.insert(purchases).values({
      id: purchaseId,
      supplierId: input.supplierId,
      receivingLocationId: input.receivingLocationId,
      purchaseDate: input.purchaseDate,
      recordedByUserId,
      notes: input.notes,
      confirmedAt,
    });

    const itemRows = input.items.map((item) => ({
      id: randomUUID(),
      purchaseId,
      productId: item.productId,
      quantityGrams: item.quantityGrams,
      paisePerKg: item.paisePerKg,
      lineAmountPaise: calculatePurchaseLineAmountPaise(item.quantityGrams, item.paisePerKg),
    }));
    await transaction.insert(purchaseItems).values(itemRows);

    await transaction.insert(inventoryMovements).values(
      itemRows.map((item) => ({
        id: randomUUID(),
        locationId: input.receivingLocationId,
        productId: item.productId,
        businessDate: input.purchaseDate,
        movementType: 'PURCHASE_RECEIPT' as const,
        quantityGrams: item.quantityGrams,
        sourceType: 'PURCHASE',
        sourceId: item.id,
        occurredAt: confirmedAt,
        createdByUserId: recordedByUserId,
      })),
    );

    const totalAmountPaise = itemRows.reduce((total, item) => total + item.lineAmountPaise, 0n);
    return {
      id: purchaseId,
      confirmedAt,
      itemCount: itemRows.length,
      totalAmountPaise: totalAmountPaise.toString(),
    };
  }
}
