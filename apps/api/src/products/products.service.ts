import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import { productPrices, products } from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import { changePriceInputSchema } from './application/change-price-input.js';
import {
  createProductFamilyInputSchema,
  type CreateProductFamilyInput,
} from './application/product-family-input.js';
import { createProductInputSchema, type CreateProductInput } from './application/product-input.js';
import { deriveDiscountedProductCode } from './domain/product-family-rules.js';

@Injectable()
export class ProductsService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async create(actor: AuthenticatedActor, idempotencyKey: string | undefined, rawInput: unknown) {
    requireAdministrator(actor);
    const parsed = createProductInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_PRODUCT_INPUT', issues: parsed.error.issues });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'products.create',
      idempotencyKey,
      parsed.data,
      (transaction) => this.createValidated(transaction, actor.userId, parsed.data),
    );
  }

  async createFamily(
    actor: AuthenticatedActor,
    idempotencyKey: string | undefined,
    rawInput: unknown,
  ) {
    requireAdministrator(actor);
    const parsed = createProductFamilyInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_FAMILY_INPUT',
        issues: parsed.error.issues,
      });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'products.create-family',
      idempotencyKey,
      parsed.data,
      (transaction) => this.createFamilyValidated(transaction, actor.userId, parsed.data),
    );
  }

  async changePrice(
    actor: AuthenticatedActor,
    idempotencyKey: string | undefined,
    productId: string,
    rawInput: unknown,
  ) {
    requireAdministrator(actor);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)
    ) {
      throw new BadRequestException({ code: 'INVALID_PRODUCT_ID' });
    }
    const parsed = changePriceInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_PRICE_INPUT', issues: parsed.error.issues });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'products.change-price',
      idempotencyKey,
      { productId, ...parsed.data },
      (transaction) => this.changePriceValidated(transaction, actor.userId, productId, parsed.data),
    );
  }

  private async createValidated(
    transaction: DatabaseTransaction,
    createdByUserId: string,
    input: CreateProductInput,
  ) {
    const productId = randomUUID();
    const priceId = randomUUID();
    const now = new Date();

    const [product] = await transaction
      .insert(products)
      .values({
        id: productId,
        name: input.name,
        productCode: input.productCode,
        recoveryBasisPoints: input.recoveryBasisPoints,
      })
      .returning();

    if (product === undefined) {
      throw new InternalServerErrorException(
        'Product creation did not return a persisted product.',
      );
    }

    await transaction.insert(productPrices).values({
      id: priceId,
      productId,
      paisePerKg: input.initialPricePaisePerKg,
      effectiveFrom: now,
      changedByUserId: createdByUserId,
    });

    return {
      product,
      initialPrice: {
        id: priceId,
        paisePerKg: input.initialPricePaisePerKg.toString(),
        effectiveFrom: now,
      },
    };
  }

  private async createFamilyValidated(
    transaction: DatabaseTransaction,
    createdByUserId: string,
    input: CreateProductFamilyInput,
  ) {
    const freshProductId = randomUUID();
    const discountedProductId = randomUUID();
    const freshPriceId = randomUUID();
    const discountedPriceId = randomUUID();
    const effectiveFrom = new Date();
    const discountedProductCode = deriveDiscountedProductCode(input.freshProductCode);

    const [freshProduct] = await transaction
      .insert(products)
      .values({
        id: freshProductId,
        name: input.freshName,
        productCode: input.freshProductCode,
        recoveryBasisPoints: 0,
        stockClass: 'FRESH',
      })
      .returning();
    if (!freshProduct) {
      throw new InternalServerErrorException(
        'Fresh product creation did not return a persisted product.',
      );
    }

    const [discountedProduct] = await transaction
      .insert(products)
      .values({
        id: discountedProductId,
        name: input.discountedName ?? `${input.freshName} (Discounted)`,
        productCode: discountedProductCode,
        recoveryBasisPoints: 0,
        stockClass: 'DISCOUNTED',
        freshProductId,
      })
      .returning();
    if (!discountedProduct) {
      throw new InternalServerErrorException(
        'Discounted product creation did not return a persisted product.',
      );
    }

    await transaction.insert(productPrices).values([
      {
        id: freshPriceId,
        productId: freshProductId,
        paisePerKg: input.freshInitialPricePaisePerKg,
        effectiveFrom,
        changedByUserId: createdByUserId,
      },
      {
        id: discountedPriceId,
        productId: discountedProductId,
        paisePerKg: input.discountedInitialPricePaisePerKg,
        effectiveFrom,
        changedByUserId: createdByUserId,
      },
    ]);

    return {
      freshProduct,
      discountedProduct,
      prices: {
        fresh: {
          id: freshPriceId,
          paisePerKg: input.freshInitialPricePaisePerKg.toString(),
          effectiveFrom,
        },
        discounted: {
          id: discountedPriceId,
          paisePerKg: input.discountedInitialPricePaisePerKg.toString(),
          effectiveFrom,
        },
      },
    };
  }

  private async changePriceValidated(
    transaction: DatabaseTransaction,
    changedByUserId: string,
    productId: string,
    input: { paisePerKg: bigint },
  ) {
    const [product] = await transaction
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId));
    if (product === undefined) {
      throw new NotFoundException('Product was not found.');
    }

    const effectiveFrom = new Date();
    const id = randomUUID();
    await transaction.insert(productPrices).values({
      id,
      productId,
      paisePerKg: input.paisePerKg,
      effectiveFrom,
      changedByUserId,
    });

    return { id, productId, paisePerKg: input.paisePerKg.toString(), effectiveFrom };
  }
}
