import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import {
  auditLogs,
  inventoryLocations,
  shops,
  userShopAssignments,
  users,
} from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import {
  assignShopUserInputSchema,
  createShopInputSchema,
  createShopUserInputSchema,
  type AssignShopUserInput,
  type CreateShopInput,
  type CreateShopUserInput,
} from './application/administration-input.js';

@Injectable()
export class AdministrationService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async createShop(actor: AuthenticatedActor, key: string | undefined, rawInput: unknown) {
    requireAdministrator(actor);
    const parsed = createShopInputSchema.safeParse(rawInput);
    if (!parsed.success)
      throw new BadRequestException({ code: 'INVALID_SHOP_INPUT', issues: parsed.error.issues });
    return this.idempotencyService.execute(actor.userId, 'shops.create', key, parsed.data, (tx) =>
      this.persistShop(tx, actor.userId, parsed.data),
    );
  }

  async createShopUser(actor: AuthenticatedActor, key: string | undefined, rawInput: unknown) {
    requireAdministrator(actor);
    const parsed = createShopUserInputSchema.safeParse(rawInput);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'INVALID_SHOP_USER_INPUT',
        issues: parsed.error.issues,
      });
    return this.idempotencyService.execute(
      actor.userId,
      'shop-users.create',
      key,
      parsed.data,
      (tx) => this.persistShopUser(tx, actor.userId, parsed.data),
    );
  }

  async assignShopUser(
    actor: AuthenticatedActor,
    key: string | undefined,
    userId: string,
    rawInput: unknown,
  ) {
    requireAdministrator(actor);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    ) {
      throw new BadRequestException({ code: 'INVALID_SHOP_USER_ID' });
    }
    const parsed = assignShopUserInputSchema.safeParse(rawInput);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'INVALID_ASSIGNMENT_INPUT',
        issues: parsed.error.issues,
      });
    return this.idempotencyService.execute(
      actor.userId,
      'shop-users.assign-shop',
      key,
      { userId, ...parsed.data },
      (tx) => this.persistAssignment(tx, actor.userId, userId, parsed.data),
    );
  }

  private async persistShop(tx: DatabaseTransaction, actorId: string, input: CreateShopInput) {
    const shopId = randomUUID();
    const locationId = randomUUID();
    const [shop] = await tx
      .insert(shops)
      .values({ id: shopId, name: input.name, timezone: input.timezone })
      .returning();
    if (!shop) throw new Error('Shop creation did not return a persisted shop.');
    await tx
      .insert(inventoryLocations)
      .values({ id: locationId, name: input.name, locationType: 'SHOP', shopId });
    await this.audit(tx, actorId, 'SHOP_CREATED', 'SHOP', shopId, { locationId });
    return { shop, locationId };
  }

  private async persistShopUser(
    tx: DatabaseTransaction,
    actorId: string,
    input: CreateShopUserInput,
  ) {
    try {
      const [user] = await tx
        .insert(users)
        .values({ id: input.authUserId, displayName: input.displayName, role: 'SHOP_USER' })
        .returning();
      if (!user) throw new Error('Shop-user creation did not return a persisted user.');
      await this.audit(tx, actorId, 'SHOP_USER_CREATED', 'USER', user.id, {});
      return user;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'An application user already exists for this authentication identity.',
        );
      }
      throw error;
    }
  }

  private async persistAssignment(
    tx: DatabaseTransaction,
    actorId: string,
    userId: string,
    input: AssignShopUserInput,
  ) {
    const [user, shop] = await Promise.all([
      tx
        .select({ role: users.role, active: users.active })
        .from(users)
        .where(eq(users.id, userId))
        .then(([row]) => row),
      tx
        .select({ id: shops.id, active: shops.active })
        .from(shops)
        .where(eq(shops.id, input.shopId))
        .then(([row]) => row),
    ]);
    if (!user || user.role !== 'SHOP_USER' || !user.active)
      throw new NotFoundException('Active shop user was not found.');
    if (!shop || !shop.active) throw new NotFoundException('Active shop was not found.');
    await tx
      .insert(userShopAssignments)
      .values({ userId, shopId: input.shopId, assignedByUserId: actorId })
      .onConflictDoNothing();
    await this.audit(tx, actorId, 'SHOP_USER_ASSIGNED', 'USER_SHOP_ASSIGNMENT', userId, {
      shopId: input.shopId,
    });
    return { userId, shopId: input.shopId };
  }

  private async audit(
    tx: DatabaseTransaction,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    detail: object,
  ) {
    await tx.insert(auditLogs).values({
      id: randomUUID(),
      actorId,
      action,
      entityType,
      entityId,
      detail: JSON.stringify(detail),
    });
  }
}
