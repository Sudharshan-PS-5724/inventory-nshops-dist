import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  requireAdministrator,
  requireCapability,
  type AuthenticatedActor,
} from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import {
  inventoryLocations,
  inventoryMovements,
  openingStockLines,
  openingStockSubmissions,
  stockTransfers,
  stockRequirementItems,
  stockRequirements,
  transferReceipts,
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
import { validateLocationDate } from '../shared/business-date.js';
import {
  createTransferInputSchema,
  dispatchTransferInputSchema,
  receiveTransferInputSchema,
  type CreateTransferInput,
  type DispatchTransferInput,
  type ReceiveTransferInput,
} from './application/transfer-input.js';
import { sortedTransferLockKeys } from './domain/transfer-locks.js';

@Injectable()
export class TransfersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

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

  async dispatch(actor: AuthenticatedActor, key: string | undefined, rawInput: unknown) {
    const parsed = dispatchTransferInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_TRANSFER_DISPATCH_INPUT',
        issues: parsed.error.issues,
      });
    }
    return this.idempotencyService.execute(
      actor.userId,
      'transfers.dispatch',
      key,
      parsed.data,
      (tx) => this.persistDispatch(tx, actor, parsed.data),
    );
  }

  async receive(
    actor: AuthenticatedActor,
    key: string | undefined,
    transferId: string,
    rawInput: unknown,
  ) {
    const parsed = receiveTransferInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_TRANSFER_RECEIPT_INPUT',
        issues: parsed.error.issues,
      });
    }
    return this.idempotencyService.execute(
      actor.userId,
      'transfers.receive',
      key,
      { transferId, ...parsed.data },
      (tx) => this.persistReceipt(tx, actor, transferId, parsed.data),
    );
  }

  async approveDiscrepancy(actor: AuthenticatedActor, key: string | undefined, transferId: string) {
    requireCapability(actor, 'HUB_MANAGE_REQUIREMENTS');
    return this.idempotencyService.execute(
      actor.userId,
      'transfers.approve-discrepancy',
      key,
      { transferId },
      async (tx) => {
        const [transfer] = await tx
          .select({ status: stockTransfers.status })
          .from(stockTransfers)
          .where(eq(stockTransfers.id, transferId));
        if (!transfer) throw new NotFoundException('Transfer was not found.');
        if (transfer.status !== 'DISCREPANCY_REVIEW') {
          throw new ConflictException('Only a discrepancy-review transfer may be approved.');
        }
        await tx
          .update(transferReceipts)
          .set({ managementApprovedByUserId: actor.userId, managementApprovedAt: new Date() })
          .where(eq(transferReceipts.transferId, transferId));
        await tx
          .update(stockTransfers)
          .set({ status: 'RECEIVED' })
          .where(eq(stockTransfers.id, transferId));
        return { id: transferId, status: 'RECEIVED' as const };
      },
    );
  }

  private async persistDispatch(
    transaction: DatabaseTransaction,
    actor: AuthenticatedActor,
    input: DispatchTransferInput,
  ) {
    const locations = await transaction
      .select({
        id: inventoryLocations.id,
        locationType: inventoryLocations.locationType,
        shopId: inventoryLocations.shopId,
      })
      .from(inventoryLocations)
      .where(inArray(inventoryLocations.id, [input.sourceLocationId, input.destinationLocationId]));
    if (locations.length !== 2)
      throw new NotFoundException('Transfer source or destination location was not found.');
    const source = locations.find((row) => row.id === input.sourceLocationId)!;
    const destination = locations.find((row) => row.id === input.destinationLocationId)!;
    if (source.locationType === 'CENTRAL') {
      requireCapability(actor, 'HUB_DISPATCH_TRANSFER');
    } else {
      requireCapability(actor, 'SHOP_INITIATE_TRANSFER');
      if (
        !source.shopId ||
        (actor.role !== 'ADMIN' && !actor.assignedShopIds.includes(source.shopId))
      ) {
        throw new NotFoundException('Transfer source location was not found.');
      }
    }
    if (input.requirementId) {
      await this.validateRequirementForDispatch(
        transaction,
        input.requirementId,
        destination.shopId,
        input.items,
      );
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
    const transferId = randomUUID();
    const now = new Date();
    await transaction.insert(stockTransfers).values({
      id: transferId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: input.destinationLocationId,
      status: 'DISPATCHED',
      initiatedByUserId: actor.userId,
      notes: input.notes,
      businessDate: input.businessDate,
      confirmedAt: now,
    });
    const rows = input.items.map((item) => ({
      id: randomUUID(),
      transferId,
      productId: item.productId,
      quantityGrams: item.quantityGrams,
      dispatchedGrams: item.quantityGrams,
    }));
    await transaction.insert(transferItems).values(rows);
    await transaction.insert(inventoryMovements).values(
      rows.map((item) => ({
        id: randomUUID(),
        locationId: input.sourceLocationId,
        productId: item.productId,
        businessDate: input.businessDate,
        movementType: 'TRANSFER_OUT' as const,
        quantityGrams: -item.quantityGrams,
        sourceType: 'TRANSFER_DISPATCH',
        sourceId: item.id,
        occurredAt: now,
        createdByUserId: actor.userId,
      })),
    );
    if (input.requirementId) {
      await transaction
        .update(stockRequirements)
        .set({ status: 'DISPATCHED', dispatchedTransferId: transferId })
        .where(eq(stockRequirements.id, input.requirementId));
    }
    return { id: transferId, status: 'DISPATCHED' as const, itemCount: rows.length };
  }

  private async persistReceipt(
    transaction: DatabaseTransaction,
    actor: AuthenticatedActor,
    transferId: string,
    input: ReceiveTransferInput,
  ) {
    const [transfer] = await transaction
      .select({
        status: stockTransfers.status,
        destinationLocationId: stockTransfers.destinationLocationId,
        sourceLocationId: stockTransfers.sourceLocationId,
        businessDate: stockTransfers.businessDate,
      })
      .from(stockTransfers)
      .where(eq(stockTransfers.id, transferId));
    if (!transfer) throw new NotFoundException('Transfer was not found.');
    if (transfer.status !== 'DISPATCHED')
      throw new ConflictException('Only a dispatched transfer can be received.');
    const [destination] = await transaction
      .select({ shopId: inventoryLocations.shopId, locationType: inventoryLocations.locationType })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.id, transfer.destinationLocationId));
    if (!destination) throw new NotFoundException('Destination location was not found.');
    if (destination.locationType === 'CENTRAL') {
      requireCapability(actor, 'HUB_RECEIVE_PURCHASE');
    } else {
      requireCapability(actor, 'SHOP_RECEIVE_TRANSFER');
      if (
        !destination.shopId ||
        (actor.role !== 'ADMIN' && !actor.assignedShopIds.includes(destination.shopId))
      ) {
        throw new NotFoundException('Destination location was not found.');
      }
    }
    await validateLocationDate(
      transaction,
      destination.shopId,
      input.businessDate,
      input.occurredAt,
    );
    const items = await transaction
      .select({
        id: transferItems.id,
        productId: transferItems.productId,
        dispatchedGrams: transferItems.dispatchedGrams,
        quantityGrams: transferItems.quantityGrams,
      })
      .from(transferItems)
      .where(eq(transferItems.transferId, transferId));
    if (items.length !== input.items.length)
      throw new BadRequestException('Receipt must include every transfer item exactly once.');
    const byId = new Map(items.map((item) => [item.id, item]));
    let hasDiscrepancy = false;
    for (const receipt of input.items) {
      const item = byId.get(receipt.transferItemId);
      const dispatched = item?.dispatchedGrams ?? item?.quantityGrams;
      if (
        !item ||
        dispatched === undefined ||
        dispatched === null ||
        receipt.receivedGrams > dispatched
      ) {
        throw new BadRequestException(
          'Received quantity must be between zero and the dispatched quantity.',
        );
      }
      if (receipt.receivedGrams !== dispatched) hasDiscrepancy = true;
    }
    if (input.decision === 'ACCEPTED' && hasDiscrepancy) {
      throw new BadRequestException('Accepted receipts must match every dispatched quantity.');
    }
    if (input.decision === 'REJECTED' && input.items.some((item) => item.receivedGrams !== 0n)) {
      throw new BadRequestException('Rejected receipts must have zero received quantities.');
    }
    if (input.decision === 'ADJUSTED' && !hasDiscrepancy) {
      throw new BadRequestException('An adjusted receipt must contain a quantity discrepancy.');
    }
    const now = input.occurredAt;
    for (const receipt of input.items) {
      await transaction
        .update(transferItems)
        .set({
          receivedGrams: receipt.receivedGrams,
          receiptReason: receipt.reason ?? input.reason,
        })
        .where(eq(transferItems.id, receipt.transferItemId));
    }
    await transaction.insert(transferReceipts).values({
      id: randomUUID(),
      transferId,
      decision: input.decision,
      receivedByUserId: actor.userId,
      receivedAt: now,
      reason: input.reason,
    });
    const inboundRows = input.items
      .filter((receipt) => receipt.receivedGrams > 0n)
      .map((receipt) => {
        const item = byId.get(receipt.transferItemId)!;
        return {
          id: randomUUID(),
          locationId: transfer.destinationLocationId,
          productId: item.productId,
          businessDate: input.businessDate,
          movementType: 'TRANSFER_IN' as const,
          quantityGrams: receipt.receivedGrams,
          sourceType: 'TRANSFER_RECEIPT',
          sourceId: item.id,
          occurredAt: now,
          createdByUserId: actor.userId,
        };
      });
    if (inboundRows.length) await transaction.insert(inventoryMovements).values(inboundRows);
    const status = hasDiscrepancy ? 'DISCREPANCY_REVIEW' : 'RECEIVED';
    await transaction
      .update(stockTransfers)
      .set({ status })
      .where(eq(stockTransfers.id, transferId));
    return { id: transferId, status, receivedAt: now };
  }

  private async validateRequirementForDispatch(
    transaction: DatabaseTransaction,
    requirementId: string,
    destinationShopId: string | null,
    items: readonly { productId: string; quantityGrams: bigint }[],
  ) {
    if (!destinationShopId)
      throw new BadRequestException('A stock requirement must dispatch to a shop.');
    const [requirement] = await transaction
      .select({ shopId: stockRequirements.shopId, status: stockRequirements.status })
      .from(stockRequirements)
      .where(eq(stockRequirements.id, requirementId));
    if (!requirement) throw new NotFoundException('Stock requirement was not found.');
    if (
      requirement.shopId !== destinationShopId ||
      !['APPROVED', 'PARTIALLY_APPROVED'].includes(requirement.status)
    ) {
      throw new ConflictException(
        'The stock requirement is not dispatchable for this destination.',
      );
    }
    const approved = await transaction
      .select({
        productId: stockRequirementItems.productId,
        approvedGrams: stockRequirementItems.approvedGrams,
      })
      .from(stockRequirementItems)
      .where(eq(stockRequirementItems.requirementId, requirementId));
    const byProduct = new Map(approved.map((item) => [item.productId, item.approvedGrams ?? 0n]));
    for (const item of items) {
      if (item.quantityGrams > (byProduct.get(item.productId) ?? 0n)) {
        throw new BadRequestException(
          'Dispatch quantity exceeds the approved requirement quantity.',
        );
      }
    }
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
    const [location] = await transaction
      .select({ locationType: inventoryLocations.locationType })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.id, locationId));
    if (!location) throw new NotFoundException('Source location was not found.');
    const [submission] = await transaction
      .select({ id: openingStockSubmissions.id })
      .from(openingStockSubmissions)
      .where(
        and(
          eq(openingStockSubmissions.locationId, locationId),
          eq(openingStockSubmissions.businessDate, businessDate),
        ),
      );
    if (submission === undefined && location.locationType === 'SHOP') {
      throw new ConflictException(
        'Source opening stock has not been submitted for this business date.',
      );
    }

    const openingLine = submission
      ? await transaction
          .select({ quantityGrams: openingStockLines.quantityGrams })
          .from(openingStockLines)
          .where(
            and(
              eq(openingStockLines.submissionId, submission.id),
              eq(openingStockLines.productId, productId),
            ),
          )
          .then(([row]) => row)
      : undefined;
    const movements = await transaction
      .select({ quantityGrams: inventoryMovements.quantityGrams })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.locationId, locationId),
          eq(inventoryMovements.productId, productId),
          location.locationType === 'CENTRAL'
            ? lte(inventoryMovements.businessDate, businessDate)
            : eq(inventoryMovements.businessDate, businessDate),
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
