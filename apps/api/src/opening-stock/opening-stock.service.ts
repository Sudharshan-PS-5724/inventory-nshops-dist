import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { requireRecordShopAccess } from '../shops/domain/shop-scope.js';
import {
  inventoryLocations,
  openingStockLines,
  openingStockSubmissions,
} from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import {
  submitOpeningStockInputSchema,
  type SubmitOpeningStockInput,
} from './application/opening-stock-input.js';

@Injectable()
export class OpeningStockService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async submit(actor: AuthenticatedActor, idempotencyKey: string | undefined, rawInput: unknown) {
    const parsed = submitOpeningStockInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_OPENING_STOCK_INPUT',
        issues: parsed.error.issues,
      });
    }

    try {
      return await this.idempotencyService.execute(
        actor.userId,
        'opening-stock.submit',
        idempotencyKey,
        parsed.data,
        async (transaction) => {
          await this.assertLocationAccess(transaction, actor, parsed.data.locationId);
          return this.persistSubmission(transaction, actor.userId, parsed.data);
        },
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Opening stock has already been submitted for this location and date.',
        );
      }
      throw error;
    }
  }

  private async assertLocationAccess(
    transaction: DatabaseTransaction,
    actor: AuthenticatedActor,
    locationId: string,
  ): Promise<void> {
    const [location] = await transaction
      .select({ locationType: inventoryLocations.locationType, shopId: inventoryLocations.shopId })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.id, locationId));

    if (location === undefined) {
      throw new NotFoundException('Inventory location was not found.');
    }
    if (location.shopId === null) {
      if (actor.role !== 'ADMIN') {
        throw new NotFoundException('Inventory location was not found.');
      }
      return;
    }
    requireRecordShopAccess(actor, { shopId: location.shopId });
  }

  private async persistSubmission(
    transaction: DatabaseTransaction,
    userId: string,
    input: SubmitOpeningStockInput,
  ) {
    const submissionId = randomUUID();
    const [submission] = await transaction
      .insert(openingStockSubmissions)
      .values({
        id: submissionId,
        locationId: input.locationId,
        businessDate: input.businessDate,
        submittedByUserId: userId,
      })
      .returning();
    if (submission === undefined) {
      throw new Error('Opening-stock submission was not returned by the database.');
    }

    await transaction.insert(openingStockLines).values(
      input.lines.map((line) => ({
        submissionId,
        productId: line.productId,
        quantityGrams: line.quantityGrams,
      })),
    );
    return submission;
  }

  private isUniqueViolation(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
