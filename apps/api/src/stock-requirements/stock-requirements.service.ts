import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  requireCapability,
  requireShopAccess,
  type AuthenticatedActor,
} from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import { products, shops, stockRequirementItems, stockRequirements } from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import {
  createStockRequirementInputSchema,
  reviewStockRequirementInputSchema,
  type CreateStockRequirementInput,
  type ReviewStockRequirementInput,
} from './application/stock-requirement-input.js';

@Injectable()
export class StockRequirementsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async create(actor: AuthenticatedActor, key: string | undefined, rawInput: unknown) {
    requireCapability(actor, 'SHOP_REQUEST_STOCK');
    const parsed = createStockRequirementInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_STOCK_REQUIREMENT_INPUT',
        issues: parsed.error.issues,
      });
    }
    requireShopAccess(actor, parsed.data.shopId);
    return this.idempotency.execute(
      actor.userId,
      'stock-requirements.create',
      key,
      parsed.data,
      (tx) => this.persistCreate(tx, actor, parsed.data),
    );
  }

  async review(
    actor: AuthenticatedActor,
    key: string | undefined,
    requirementId: string,
    rawInput: unknown,
  ) {
    requireCapability(actor, 'HUB_MANAGE_REQUIREMENTS');
    const parsed = reviewStockRequirementInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REQUIREMENT_REVIEW_INPUT',
        issues: parsed.error.issues,
      });
    }
    return this.idempotency.execute(
      actor.userId,
      'stock-requirements.review',
      key,
      { requirementId, ...parsed.data },
      (tx) => this.persistReview(tx, actor.userId, requirementId, parsed.data),
    );
  }

  async list(actor: AuthenticatedActor, shopId?: string) {
    if (shopId && actor.role !== 'ADMIN') requireShopAccess(actor, shopId);
    if (!shopId && actor.role !== 'ADMIN' && !actor.assignedShopIds.length) return [];
    const where = shopId
      ? eq(stockRequirements.shopId, shopId)
      : actor.role === 'ADMIN' || actor.role.startsWith('HUB_')
        ? undefined
        : inArray(stockRequirements.shopId, [...actor.assignedShopIds]);
    const headers = await this.database.db
      .select({
        id: stockRequirements.id,
        shopId: stockRequirements.shopId,
        status: stockRequirements.status,
        reviewReason: stockRequirements.reviewReason,
        requestedAt: stockRequirements.requestedAt,
        shopName: shops.name,
      })
      .from(stockRequirements)
      .innerJoin(shops, eq(stockRequirements.shopId, shops.id))
      .where(where)
      .orderBy(stockRequirements.requestedAt);
    if (!headers.length) return [];
    const items = await this.database.db
      .select({
        id: stockRequirementItems.id,
        requirementId: stockRequirementItems.requirementId,
        productId: stockRequirementItems.productId,
        requestedGrams: stockRequirementItems.requestedGrams,
        approvedGrams: stockRequirementItems.approvedGrams,
      })
      .from(stockRequirementItems)
      .where(
        inArray(
          stockRequirementItems.requirementId,
          headers.map((header) => header.id),
        ),
      );
    return headers.map((header) => ({
      ...header,
      items: items.filter((item) => item.requirementId === header.id),
    }));
  }

  private async persistCreate(
    tx: DatabaseTransaction,
    actor: AuthenticatedActor,
    input: CreateStockRequirementInput,
  ) {
    const [shop] = await tx.select({ id: shops.id }).from(shops).where(eq(shops.id, input.shopId));
    if (!shop) throw new NotFoundException('Shop was not found.');
    const found = await tx
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
    if (found.length !== input.items.length)
      throw new NotFoundException('One or more active products were not found.');
    const id = randomUUID();
    await tx
      .insert(stockRequirements)
      .values({ id, shopId: input.shopId, requestedByUserId: actor.userId });
    await tx.insert(stockRequirementItems).values(
      input.items.map((item) => ({
        id: randomUUID(),
        requirementId: id,
        productId: item.productId,
        requestedGrams: item.requestedGrams,
      })),
    );
    return { id, status: 'REQUESTED' as const, itemCount: input.items.length };
  }

  private async persistReview(
    tx: DatabaseTransaction,
    reviewerId: string,
    requirementId: string,
    input: ReviewStockRequirementInput,
  ) {
    const [requirement] = await tx
      .select({ status: stockRequirements.status })
      .from(stockRequirements)
      .where(eq(stockRequirements.id, requirementId));
    if (!requirement) throw new NotFoundException('Stock requirement was not found.');
    if (requirement.status !== 'REQUESTED') {
      throw new ConflictException('Only a requested stock requirement can be reviewed.');
    }
    const persistedItems = await tx
      .select({
        id: stockRequirementItems.id,
        requestedGrams: stockRequirementItems.requestedGrams,
      })
      .from(stockRequirementItems)
      .where(eq(stockRequirementItems.requirementId, requirementId));
    if (persistedItems.length !== input.items.length) {
      throw new BadRequestException('The review must include every requirement item exactly once.');
    }
    const itemsById = new Map(persistedItems.map((item) => [item.id, item]));
    for (const item of input.items) {
      const persisted = itemsById.get(item.itemId);
      if (!persisted || item.approvedGrams > persisted.requestedGrams) {
        throw new BadRequestException('Approved quantity must not exceed the requested quantity.');
      }
      if (input.status === 'REJECTED' && item.approvedGrams !== 0n) {
        throw new BadRequestException('Rejected requirements must have zero approved quantities.');
      }
    }
    await tx
      .update(stockRequirements)
      .set({
        status: input.status,
        reviewReason: input.reason,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(stockRequirements.id, requirementId));
    for (const item of input.items) {
      await tx
        .update(stockRequirementItems)
        .set({ approvedGrams: item.approvedGrams })
        .where(eq(stockRequirementItems.id, item.itemId));
    }
    return { id: requirementId, status: input.status, itemCount: input.items.length };
  }
}
