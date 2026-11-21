import { describe, expect, it } from 'vitest';
import {
  AccessDeniedError,
  hasCapability,
  requireCapability,
  requireAdministrator,
  requireShopAccess,
  type AuthenticatedActor,
} from './access-policy.js';

const actor = (role: AuthenticatedActor['role']): AuthenticatedActor => ({
  userId: '00000000-0000-4000-8000-000000000001',
  role,
  assignedShopIds: ['00000000-0000-4000-8000-000000000002'],
});

describe('capability policy', () => {
  it('keeps the administrator globally capable', () => {
    expect(hasCapability(actor('ADMIN'), 'HUB_MANAGE_REQUIREMENTS')).toBe(true);
    expect(hasCapability(actor('ADMIN'), 'SHOP_RECEIVE_TRANSFER')).toBe(true);
  });

  it('does not let a storekeeper dispatch a hub transfer', () => {
    expect(() => requireCapability(actor('STOREKEEPER'), 'HUB_DISPATCH_TRANSFER')).toThrow(
      AccessDeniedError,
    );
  });

  it('lets a shop manager create shop work but not central purchase receipts', () => {
    expect(hasCapability(actor('SHOP_MANAGER'), 'SHOP_REQUEST_STOCK')).toBe(true);
    expect(hasCapability(actor('SHOP_MANAGER'), 'HUB_RECEIVE_PURCHASE')).toBe(false);
  });

  it('keeps existing shop-assignment and administrator guards intact', () => {
    const shopUser = actor('SHOP_USER');
    expect(() => requireShopAccess(shopUser, shopUser.assignedShopIds[0]!)).not.toThrow();
    expect(() => requireShopAccess(shopUser, '71f44624-6f41-4e66-a784-1ffdb0d232f0')).toThrow(
      AccessDeniedError,
    );
    expect(() => requireAdministrator(shopUser)).toThrow(AccessDeniedError);
  });
});
