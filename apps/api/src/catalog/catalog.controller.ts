import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import {
  inventoryLocations,
  productPrices,
  products,
  shops,
  suppliers,
} from '../database/schema.js';

@Controller()
@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
export class CatalogController {
  constructor(private readonly database: DatabaseService) {}

  @Get('identity')
  identity(@CurrentActor() actor: AuthenticatedActor) {
    return actor;
  }

  @Get('shops')
  async shops(@CurrentActor() actor: AuthenticatedActor) {
    if (actor.role !== 'ADMIN' && !actor.assignedShopIds.length) return [];
    return this.database.db
      .select({
        id: shops.id,
        name: shops.name,
        timezone: shops.timezone,
        locationId: inventoryLocations.id,
      })
      .from(shops)
      .innerJoin(inventoryLocations, eq(inventoryLocations.shopId, shops.id))
      .where(
        and(
          eq(shops.active, true),
          actor.role === 'ADMIN' ? undefined : inArray(shops.id, [...actor.assignedShopIds]),
        ),
      )
      .orderBy(shops.name);
  }

  @Get('products')
  async products() {
    const rows = await this.database.db
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(products.name);
    if (!rows.length) return [];
    const prices = await this.database.db
      .selectDistinctOn([productPrices.productId], {
        productId: productPrices.productId,
        paisePerKg: productPrices.paisePerKg,
      })
      .from(productPrices)
      .where(
        and(
          inArray(
            productPrices.productId,
            rows.map((row) => row.id),
          ),
          lte(productPrices.effectiveFrom, new Date()),
        ),
      )
      .orderBy(
        productPrices.productId,
        desc(productPrices.effectiveFrom),
        desc(productPrices.createdAt),
        desc(productPrices.id),
      );
    const byId = new Map(prices.map((price) => [price.productId, price.paisePerKg.toString()]));
    return rows.map((row) => ({ ...row, paisePerKg: byId.get(row.id) ?? null }));
  }

  @Get('suppliers')
  suppliers(@CurrentActor() actor: AuthenticatedActor) {
    requireAdministrator(actor);
    return this.database.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.active, true))
      .orderBy(suppliers.name);
  }
}
