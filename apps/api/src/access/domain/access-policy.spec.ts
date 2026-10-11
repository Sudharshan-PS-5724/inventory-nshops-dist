import { describe, expect, it } from 'vitest';
import {
  AccessDeniedError,
  requireAdministrator,
  requireShopAccess,
  type AuthenticatedActor,
} from './access-policy.js';

const shopUser: AuthenticatedActor = {
  userId: 'b6c138b1-70f7-4330-a72f-6fa9ac8f376e',
  role: 'SHOP_USER',
  assignedShopIds: ['d7cc758d-8cc7-4909-936d-f7b26762ae8f'],
};

describe('access policy', () => {
  it('allows a shop user only at their assigned shop', () => {
    expect(() => requireShopAccess(shopUser, shopUser.assignedShopIds[0]!)).not.toThrow();
    expect(() => requireShopAccess(shopUser, '71f44624-6f41-4e66-a784-1ffdb0d232f0')).toThrow(
      AccessDeniedError,
    );
  });

  it('requires an administrator to perform privileged operations', () => {
    expect(() => requireAdministrator(shopUser)).toThrow(AccessDeniedError);
    expect(() =>
      requireAdministrator({ ...shopUser, role: 'ADMIN', assignedShopIds: [] }),
    ).not.toThrow();
  });
});
