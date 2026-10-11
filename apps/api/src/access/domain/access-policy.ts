export type ApplicationRole = 'ADMIN' | 'SHOP_USER';

export interface AuthenticatedActor {
  readonly userId: string;
  readonly role: ApplicationRole;
  readonly assignedShopIds: readonly string[];
}

export class AccessDeniedError extends Error {
  constructor(message = 'The actor is not authorized for this operation.') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export function requireAdministrator(actor: AuthenticatedActor): void {
  if (actor.role !== 'ADMIN') {
    throw new AccessDeniedError('Administrator access is required.');
  }
}

export function requireShopAccess(actor: AuthenticatedActor, shopId: string): void {
  if (actor.role === 'ADMIN') {
    return;
  }

  if (!actor.assignedShopIds.includes(shopId)) {
    throw new AccessDeniedError('The actor is not assigned to this shop.');
  }
}
