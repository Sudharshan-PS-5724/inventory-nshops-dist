import { AccessDeniedError, type AuthenticatedActor } from '../../access/domain/access-policy.js';

export interface ShopScopedRecord {
  readonly shopId: string;
}

/**
 * Centralizes the rule that shop users may read/write only records belonging to
 * an assigned shop. API services call this after resolving the record from the
 * database; a client-supplied shop ID is never sufficient authorization.
 */
export function requireRecordShopAccess(actor: AuthenticatedActor, record: ShopScopedRecord): void {
  if (actor.role === 'ADMIN' || actor.assignedShopIds.includes(record.shopId)) {
    return;
  }

  throw new AccessDeniedError('The actor is not authorized for the record shop.');
}
