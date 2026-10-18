import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import {
  inventoryLocations,
  inventoryMovements,
  openingStockLines,
  openingStockSubmissions,
  products,
} from '../database/schema.js';
import { requireRecordShopAccess } from '../shops/domain/shop-scope.js';
import { availabilityInputSchema } from './application/availability-input.js';
import { calculateAvailableGrams } from './domain/inventory-accounting.js';

@Injectable()
export class InventoryAvailabilityService {
  constructor(private readonly databaseService: DatabaseService) {}

  async get(actor: AuthenticatedActor, rawInput: unknown) {
    const parsed = availabilityInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_AVAILABILITY_QUERY',
        issues: parsed.error.issues,
      });
    }
    const { locationId, businessDate } = parsed.data;

    const [location] = await this.databaseService.db
      .select({ shopId: inventoryLocations.shopId })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.id, locationId));
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

    const [submission] = await this.databaseService.db
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, locationId),
          eq(openingStockSubmissions.businessDate, businessDate),
        ),
      );
    if (submission === undefined) {
      throw new NotFoundException(
        'Opening stock has not been submitted for this location and business date.',
      );
    }

    const [openingLines, movements] = await Promise.all([
      this.databaseService.db
        .select({
          productId: openingStockLines.productId,
          openingGrams: openingStockLines.quantityGrams,
        })
        .from(openingStockLines)
        .where(eq(openingStockLines.submissionId, submission.id)),
      this.databaseService.db
        .select({
          productId: inventoryMovements.productId,
          quantityGrams: inventoryMovements.quantityGrams,
        })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.locationId, locationId),
            eq(inventoryMovements.businessDate, businessDate),
          ),
        ),
    ]);

    const movementsByProduct = new Map<string, bigint[]>();
    for (const movement of movements) {
      const values = movementsByProduct.get(movement.productId) ?? [];
      values.push(movement.quantityGrams);
      movementsByProduct.set(movement.productId, values);
    }

    const openingByProduct = new Map(
      openingLines.map((line) => [line.productId, line.openingGrams]),
    );
    const productIds = [...new Set([...openingByProduct.keys(), ...movementsByProduct.keys()])];
    if (!productIds.length) return [];
    const productRows = await this.databaseService.db
      .select({ id: products.id, name: products.name, productCode: products.productCode })
      .from(products)
      .where(inArray(products.id, productIds));
    const productsById = new Map(productRows.map((product) => [product.id, product]));

    return productIds.map((productId) => {
      const product = productsById.get(productId);
      if (product === undefined) {
        throw new Error('Opening stock references a missing product.');
      }
      const availableGrams = calculateAvailableGrams(
        openingByProduct.get(productId) ?? 0n,
        (movementsByProduct.get(productId) ?? []).map((quantityGrams) => ({ quantityGrams })),
      );
      return {
        productId: product.id,
        productName: product.name,
        productCode: product.productCode,
        openingGrams: (openingByProduct.get(productId) ?? 0n).toString(),
        availableGrams: availableGrams.toString(),
        lowStock: availableGrams <= 5_000n,
      };
    });
  }
}
