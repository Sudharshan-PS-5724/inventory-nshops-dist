import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import {
  devices,
  inventoryLocations,
  inventoryMovements,
  machinePluMappings,
  machineSaleEvents,
  openingStockLines,
  openingStockSubmissions,
  products,
  saleItems,
  sales,
  shops,
} from '../database/schema.js';
import type { DatabaseTransaction } from '../idempotency/idempotency.service.js';
import {
  calculateAvailableGrams,
  InsufficientInventoryError,
  requireSufficientInventory,
} from '../inventory/domain/inventory-accounting.js';
import { businessDateFor, isTimezone } from '../shared/business-date.js';
import {
  machineSaleEventInputSchema,
  type MachineSaleEventInput,
} from './application/machine-sale-event-input.js';

type QuarantineReason =
  | 'DEVICE_NOT_FOUND'
  | 'PLU_NOT_MAPPED'
  | 'OPENING_STOCK_MISSING'
  | 'INSUFFICIENT_STOCK'
  | 'AMOUNT_MISMATCH';

@Injectable()
export class MachineIngestionService {
  constructor(private readonly database: DatabaseService) {}

  async ingest(rawInput: unknown) {
    const parsed = machineSaleEventInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_MACHINE_SALE_EVENT',
        issues: parsed.error.issues,
      });
    }
    return this.database.db.transaction((tx) => this.persist(tx, parsed.data));
  }

  private async persist(tx: DatabaseTransaction, input: MachineSaleEventInput) {
    const [device] = await tx
      .select({
        id: devices.id,
        active: devices.active,
        locationId: devices.locationId,
        shopId: inventoryLocations.shopId,
        timezone: shops.timezone,
      })
      .from(devices)
      .innerJoin(inventoryLocations, eq(devices.locationId, inventoryLocations.id))
      .innerJoin(shops, eq(inventoryLocations.shopId, shops.id))
      .where(eq(devices.id, input.deviceId))
      .for('share');

    const eventId = randomUUID();
    const inserted = await tx
      .insert(machineSaleEvents)
      .values({
        id: eventId,
        deviceId: input.deviceId,
        recordEpoch: input.recordEpoch,
        recordSequence: input.recordSequence,
        status: 'PENDING_REVIEW',
        rawPayload: input.rawPayload,
        occurredAt: input.occurredAt,
      })
      .onConflictDoNothing()
      .returning({ id: machineSaleEvents.id });
    if (!inserted.length) return this.existingEventResponse(tx, input);

    if (!device || !device.active || !device.shopId || !isTimezone(device.timezone)) {
      return this.quarantine(tx, eventId, 'DEVICE_NOT_FOUND');
    }
    const businessDate = businessDateFor(input.occurredAt, device.timezone);
    const [mapping] = await tx
      .select({ productId: machinePluMappings.productId })
      .from(machinePluMappings)
      .innerJoin(products, eq(machinePluMappings.productId, products.id))
      .where(
        and(
          eq(machinePluMappings.deviceId, device.id),
          eq(machinePluMappings.pluCode, input.pluCode),
          eq(machinePluMappings.active, true),
          eq(products.active, true),
        ),
      )
      .for('share');
    if (!mapping) return this.quarantine(tx, eventId, 'PLU_NOT_MAPPED');

    const expectedAmountPaise = (input.quantityGrams * input.unitPricePaisePerKg + 500n) / 1000n;
    if (input.amountPaise !== expectedAmountPaise) {
      return this.quarantine(tx, eventId, 'AMOUNT_MISMATCH');
    }

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${device.locationId}:${mapping.productId}:${businessDate}`}, 0))`,
    );
    const [submission] = await tx
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, device.locationId),
          eq(openingStockSubmissions.businessDate, businessDate),
        ),
      );
    if (!submission) return this.quarantine(tx, eventId, 'OPENING_STOCK_MISSING');
    const [opening, movements] = await Promise.all([
      tx
        .select({ quantityGrams: openingStockLines.quantityGrams })
        .from(openingStockLines)
        .where(
          and(
            eq(openingStockLines.submissionId, submission.id),
            eq(openingStockLines.productId, mapping.productId),
          ),
        ),
      tx
        .select({ quantityGrams: inventoryMovements.quantityGrams })
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.locationId, device.locationId),
            eq(inventoryMovements.productId, mapping.productId),
            eq(inventoryMovements.businessDate, businessDate),
          ),
        ),
    ]);
    try {
      requireSufficientInventory(
        calculateAvailableGrams(
          opening[0]?.quantityGrams ?? 0n,
          movements.map((movement) => ({ quantityGrams: movement.quantityGrams })),
        ),
        input.quantityGrams,
      );
    } catch (error) {
      if (error instanceof InsufficientInventoryError) {
        return this.quarantine(tx, eventId, 'INSUFFICIENT_STOCK');
      }
      throw error;
    }

    const saleId = randomUUID();
    const saleItemId = randomUUID();
    await tx.insert(sales).values({
      id: saleId,
      locationId: device.locationId,
      deviceId: device.id,
      machineEventId: eventId,
      classification: 'NORMAL',
      soldAt: input.occurredAt,
      paymentMode: input.paymentMode,
    });
    await tx.insert(saleItems).values({
      id: saleItemId,
      saleId,
      productId: mapping.productId,
      machinePluCode: input.pluCode,
      quantityGrams: input.quantityGrams,
      unitPricePaisePerKg: input.unitPricePaisePerKg,
      lineAmountPaise: input.amountPaise,
    });
    await tx.insert(inventoryMovements).values({
      id: randomUUID(),
      locationId: device.locationId,
      productId: mapping.productId,
      businessDate,
      movementType: 'NORMAL_SALE',
      quantityGrams: -input.quantityGrams,
      sourceType: 'MACHINE_SALE',
      sourceId: saleItemId,
      occurredAt: input.occurredAt,
    });
    await tx
      .update(machineSaleEvents)
      .set({ status: 'ACCEPTED' })
      .where(eq(machineSaleEvents.id, eventId));
    return {
      machineEventId: eventId,
      saleId,
      status: 'ACCEPTED' as const,
      businessDate,
      duplicate: false,
    };
  }

  private async existingEventResponse(tx: DatabaseTransaction, input: MachineSaleEventInput) {
    const [existing] = await tx
      .select({
        id: machineSaleEvents.id,
        rawPayload: machineSaleEvents.rawPayload,
        status: machineSaleEvents.status,
        quarantineReason: machineSaleEvents.quarantineReason,
        saleId: sales.id,
      })
      .from(machineSaleEvents)
      .leftJoin(sales, eq(sales.machineEventId, machineSaleEvents.id))
      .where(
        and(
          eq(machineSaleEvents.deviceId, input.deviceId),
          eq(machineSaleEvents.recordEpoch, input.recordEpoch),
          eq(machineSaleEvents.recordSequence, input.recordSequence),
        ),
      );
    if (!existing)
      throw new ConflictException('Machine event is concurrently being processed; retry.');
    if (existing.rawPayload !== input.rawPayload) {
      throw new ConflictException(
        'Machine event identity collision: the same device record has different raw data.',
      );
    }
    return {
      machineEventId: existing.id,
      saleId: existing.saleId,
      status: existing.status,
      quarantineReason: existing.quarantineReason,
      duplicate: true,
    };
  }

  private async quarantine(tx: DatabaseTransaction, eventId: string, reason: QuarantineReason) {
    await tx
      .update(machineSaleEvents)
      .set({ status: 'QUARANTINED', quarantineReason: reason })
      .where(eq(machineSaleEvents.id, eventId));
    return {
      machineEventId: eventId,
      status: 'QUARANTINED' as const,
      quarantineReason: reason,
      duplicate: false,
    };
  }
}
