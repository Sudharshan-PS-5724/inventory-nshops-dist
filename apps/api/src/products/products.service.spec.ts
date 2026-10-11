import { describe, expect, it } from 'vitest';
import { AccessDeniedError } from '../access/domain/access-policy.js';
import type { IdempotencyService } from '../idempotency/idempotency.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  it('rejects product creation from a shop user before persistence is reached', async () => {
    const service = new ProductsService({} as IdempotencyService);

    await expect(
      service.create(
        {
          userId: 'e17d8e8a-9521-4e12-bd45-5cabda8abf18',
          role: 'SHOP_USER',
          assignedShopIds: ['shop-a'],
        },
        undefined,
        {
          name: 'Banana',
          productCode: 'BANANA',
          recoveryBasisPoints: 3000,
          initialPricePaisePerKg: 6000,
        },
      ),
    ).rejects.toThrow(AccessDeniedError);
  });
});
