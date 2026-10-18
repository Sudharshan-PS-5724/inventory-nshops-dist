import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import {
  auditLogs,
  devices,
  inventoryLocations,
  machinePluMappings,
  openingStockLines,
  openingStockSubmissions,
  productPrices,
  products,
  shops,
} from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import { requireRecordShopAccess } from '../shops/domain/shop-scope.js';
import {
  masterImportSchema,
  parseMasterCsv,
  registerMachineSchema,
  pluMappingSchema,
} from './integration-input.js';

@Injectable()
export class ShopIntegrationService {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly database: DatabaseService,
  ) {}

  async register(actor: AuthenticatedActor, key: string | undefined, body: unknown) {
    requireAdministrator(actor);
    const parsed = registerMachineSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.idempotency.execute(
      actor.userId,
      'machines.register',
      key,
      parsed.data,
      async (tx) => {
        const location = await this.shopLocation(tx, parsed.data.shopId);
        const id = randomUUID();
        const inserted = await tx
          .insert(devices)
          .values({
            id,
            locationId: location.id,
            name: parsed.data.name,
            machineType: parsed.data.machineType,
            hardwareIdentifier: parsed.data.hardwareIdentifier,
          })
          .onConflictDoNothing()
          .returning({ id: devices.id });
        if (!inserted.length)
          throw new ConflictException('This machine asset label is already registered.');
        await this.audit(tx, actor.userId, 'MACHINE_REGISTERED', id, parsed.data);
        return { id, ...parsed.data, locationId: location.id, connectionStatus: 'NOT_PAIRED' };
      },
    );
  }

  async list(actor: AuthenticatedActor, shopId: string) {
    if (!z.uuid().safeParse(shopId).success) throw new BadRequestException('Invalid shop ID.');
    requireRecordShopAccess(actor, { shopId });
    return this.database.db
      .select({
        id: devices.id,
        name: devices.name,
        machineType: devices.machineType,
        hardwareIdentifier: devices.hardwareIdentifier,
        active: devices.active,
        locationId: devices.locationId,
      })
      .from(devices)
      .innerJoin(inventoryLocations, eq(devices.locationId, inventoryLocations.id))
      .where(eq(inventoryLocations.shopId, shopId));
  }

  preview(actor: AuthenticatedActor, body: unknown) {
    requireAdministrator(actor);
    const input = this.parseImport(body);
    const rows = parseMasterCsv(input.csv);
    return {
      validation: 'FORMAT_ONLY',
      shopId: input.shopId,
      businessDate: input.businessDate,
      deviceIds: input.deviceIds,
      rowCount: rows.length,
      rows: rows.map((row) => ({
        ...row,
        initialPricePaisePerKg: row.initialPricePaisePerKg.toString(),
        openingGrams: row.openingGrams.toString(),
      })),
      notice:
        'Commit rechecks shop, machines, products, PLUs and opening-stock conflicts. Existing product prices are not changed.',
    };
  }

  async importMaster(actor: AuthenticatedActor, key: string | undefined, body: unknown) {
    requireAdministrator(actor);
    const input = this.parseImport(body);
    const rows = parseMasterCsv(input.csv);
    return this.idempotency.execute(actor.userId, 'master.import', key, input, async (tx) => {
      const location = await this.shopLocation(tx, input.shopId);
      if (input.deviceIds.length) {
        const selected = await tx
          .select()
          .from(devices)
          .where(inArray(devices.id, input.deviceIds))
          .for('share');
        if (
          selected.length !== input.deviceIds.length ||
          selected.some((device) => !device.active || device.locationId !== location.id)
        ) {
          throw new ConflictException(
            'Every selected machine must be active and belong to this shop.',
          );
        }
      }
      const submissionId = randomUUID();
      const inserted = await tx
        .insert(openingStockSubmissions)
        .values({
          id: submissionId,
          locationId: location.id,
          businessDate: input.businessDate,
          submittedByUserId: actor.userId,
        })
        .onConflictDoNothing()
        .returning({ id: openingStockSubmissions.id });
      if (!inserted.length)
        throw new ConflictException(
          'Opening stock for this shop/date is already locked. Nothing was imported.',
        );

      let createdProducts = 0;
      // Stable order also limits deadlocks when different shops import the same master concurrently.
      for (const row of [...rows].sort((a, b) => a.productCode.localeCompare(b.productCode))) {
        const candidateId = randomUUID();
        const created = await tx
          .insert(products)
          .values({
            id: candidateId,
            productCode: row.productCode,
            name: row.name,
            recoveryBasisPoints: row.recoveryBasisPoints,
          })
          .onConflictDoNothing()
          .returning({ id: products.id });
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.productCode, row.productCode))
          .for('share');
        if (
          !product ||
          !product.active ||
          product.name !== row.name ||
          product.recoveryBasisPoints !== row.recoveryBasisPoints
        ) {
          throw new ConflictException(
            `Product ${row.productCode} conflicts with the active master. Edit the product separately.`,
          );
        }
        if (created.length) {
          createdProducts++;
          await tx.insert(productPrices).values({
            id: randomUUID(),
            productId: product.id,
            paisePerKg: row.initialPricePaisePerKg,
            effectiveFrom: new Date(),
            changedByUserId: actor.userId,
          });
        }
        await tx
          .insert(openingStockLines)
          .values({ submissionId, productId: product.id, quantityGrams: row.openingGrams });
        for (const deviceId of input.deviceIds) {
          await tx
            .insert(machinePluMappings)
            .values({ id: randomUUID(), deviceId, pluCode: row.pluCode, productId: product.id })
            .onConflictDoNothing();
          const [mapping] = await tx
            .select()
            .from(machinePluMappings)
            .where(
              and(
                eq(machinePluMappings.deviceId, deviceId),
                eq(machinePluMappings.pluCode, row.pluCode),
              ),
            )
            .for('share');
          if (!mapping || !mapping.active || mapping.productId !== product.id) {
            throw new ConflictException(
              `PLU ${row.pluCode} is already assigned differently on machine ${deviceId}. Nothing was imported.`,
            );
          }
        }
      }
      await this.audit(tx, actor.userId, 'MASTER_OPENING_IMPORTED', submissionId, {
        shopId: input.shopId,
        businessDate: input.businessDate,
        deviceIds: input.deviceIds,
        rowCount: rows.length,
      });
      return {
        submissionId,
        locationId: location.id,
        rowCount: rows.length,
        createdProducts,
        mappedMachines: input.deviceIds.length,
        openingStockLocked: true,
        hardwareUpdated: false,
      };
    });
  }

  private parseImport(body: unknown) {
    const parsed = masterImportSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return parsed.data;
  }

  async mapPlus(actor: AuthenticatedActor, key: string | undefined, body: unknown) {
    requireAdministrator(actor);
    const parsed = pluMappingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.idempotency.execute(
      actor.userId,
      'machines.map-plus',
      key,
      parsed.data,
      async (tx) => {
        const [device] = await tx
          .select()
          .from(devices)
          .where(eq(devices.id, parsed.data.deviceId))
          .for('share');
        if (!device || !device.active) throw new NotFoundException('Active machine was not found.');
        const [location] = await tx
          .select()
          .from(inventoryLocations)
          .where(eq(inventoryLocations.id, device.locationId));
        if (!location?.shopId) throw new ConflictException('Machine must belong to a shop.');
        await this.shopLocation(tx, location.shopId);
        const ids = [...new Set(parsed.data.mappings.map((row) => row.productId))];
        const activeProducts = await tx
          .select({ id: products.id })
          .from(products)
          .where(and(inArray(products.id, ids), eq(products.active, true)))
          .for('share');
        if (activeProducts.length !== ids.length)
          throw new NotFoundException('One or more active products were not found.');
        for (const row of [...parsed.data.mappings].sort((a, b) =>
          a.pluCode.localeCompare(b.pluCode),
        )) {
          await tx
            .insert(machinePluMappings)
            .values({ id: randomUUID(), deviceId: device.id, ...row })
            .onConflictDoNothing();
          const [existing] = await tx
            .select()
            .from(machinePluMappings)
            .where(
              and(
                eq(machinePluMappings.deviceId, device.id),
                eq(machinePluMappings.pluCode, row.pluCode),
              ),
            )
            .for('share');
          if (!existing?.active || existing.productId !== row.productId)
            throw new ConflictException(
              `PLU ${row.pluCode} already has a different or inactive mapping. Historical mappings cannot be overwritten.`,
            );
        }
        await this.audit(tx, actor.userId, 'MACHINE_PLUS_MAPPED', device.id, parsed.data);
        return {
          deviceId: device.id,
          mappingCount: parsed.data.mappings.length,
          hardwareUpdated: false,
        };
      },
    );
  }

  private async shopLocation(tx: DatabaseTransaction, shopId: string) {
    const [location] = await tx
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .innerJoin(shops, eq(inventoryLocations.shopId, shops.id))
      .where(
        and(
          eq(shops.id, shopId),
          eq(shops.active, true),
          eq(inventoryLocations.locationType, 'SHOP'),
        ),
      )
      .for('share');
    if (!location) throw new NotFoundException('Active shop inventory location was not found.');
    return location;
  }

  private async audit(
    tx: DatabaseTransaction,
    actorId: string,
    action: string,
    entityId: string,
    detail: object,
  ) {
    await tx.insert(auditLogs).values({
      id: randomUUID(),
      actorId,
      action,
      entityType: action.startsWith('MACHINE_') ? 'DEVICE' : 'OPENING_STOCK',
      entityId,
      detail: JSON.stringify(detail),
    });
  }
}
