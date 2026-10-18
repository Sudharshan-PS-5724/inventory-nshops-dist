import { describe, expect, it, vi } from 'vitest';
import { AccessDeniedError, type AuthenticatedActor } from '../access/domain/access-policy.js';
import type { DatabaseService } from '../database/database.service.js';
import type { IdempotencyService } from '../idempotency/idempotency.service.js';
import { ShopIntegrationService } from './shop-integration.service.js';

const actor: AuthenticatedActor = {
  userId: 'c68836b8-4ed7-4269-a813-ab1be6eafd35',
  role: 'SHOP_USER',
  assignedShopIds: [],
};
describe('shop integration authorization', () => {
  const execute = vi.fn();
  const service = new ShopIntegrationService(
    { execute } as unknown as IdempotencyService,
    {} as DatabaseService,
  );
  it('rejects shop-user registration before persistence', async () => {
    await expect(service.register(actor, 'key', {})).rejects.toThrow(AccessDeniedError);
    expect(execute).not.toHaveBeenCalled();
  });
  it('rejects shop-user master import and preview', async () => {
    await expect(service.importMaster(actor, 'key', {})).rejects.toThrow(AccessDeniedError);
    expect(() => service.preview(actor, {})).toThrow(AccessDeniedError);
    expect(execute).not.toHaveBeenCalled();
  });
  it('does not list another shop machines', async () => {
    await expect(service.list(actor, actor.userId)).rejects.toThrow(AccessDeniedError);
  });
  it('validates shop IDs before querying', async () => {
    await expect(service.list({ ...actor, role: 'ADMIN' }, 'bad')).rejects.toThrow(
      'Invalid shop ID',
    );
  });
});
