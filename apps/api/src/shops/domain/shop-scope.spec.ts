import { describe, expect, it } from 'vitest';
import { AccessDeniedError, type AuthenticatedActor } from '../../access/domain/access-policy.js';
import { requireRecordShopAccess } from './shop-scope.js';

describe('shop scope', () => {
  const shopUser: AuthenticatedActor = {
    userId: 'b6c138b1-70f7-4330-a72f-6fa9ac8f376e',
    role: 'SHOP_USER',
    assignedShopIds: ['shop-a'],
  };

  it('rejects a shop user attempting to access another shop record', () => {
    expect(() => requireRecordShopAccess(shopUser, { shopId: 'shop-b' })).toThrow(
      AccessDeniedError,
    );
  });

  it('allows the sole administrator to access every shop record', () => {
    expect(() =>
      requireRecordShopAccess(
        { ...shopUser, role: 'ADMIN', assignedShopIds: [] },
        { shopId: 'shop-b' },
      ),
    ).not.toThrow();
  });
});
