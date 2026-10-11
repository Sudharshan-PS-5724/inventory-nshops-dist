import { describe, expect, it } from 'vitest';
import { AccessDeniedError } from '../access/domain/access-policy.js';
import type { IdempotencyService } from '../idempotency/idempotency.service.js';
import { AdministrationService } from './administration.service.js';

describe('AdministrationService', () => {
  it('rejects shop creation from a shop user before persistence is reached', async () => {
    const service = new AdministrationService({} as IdempotencyService);
    await expect(
      service.createShop(
        { userId: 'c68836b8-4ed7-4269-a813-ab1be6eafd35', role: 'SHOP_USER', assignedShopIds: [] },
        undefined,
        { name: 'Shop A', timezone: 'Asia/Kolkata' },
      ),
    ).rejects.toThrow(AccessDeniedError);
  });
});
