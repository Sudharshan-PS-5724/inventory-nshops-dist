/**
 * `SHOP_USER` is retained for existing accounts. New accounts should use the
 * more precise roles below. Permissions are granted by capability, never by a
 * mobile client's selected screen or role claim.
 */
export type ApplicationRole =
  'ADMIN' | 'HUB_MANAGER' | 'HUB_EMPLOYEE' | 'SHOP_MANAGER' | 'STOREKEEPER' | 'SHOP_USER';

export type Capability =
  | 'BUSINESS_ADMINISTER'
  | 'HUB_RECEIVE_PURCHASE'
  | 'HUB_MANAGE_SUPPLIERS'
  | 'HUB_MANAGE_REQUIREMENTS'
  | 'HUB_DISPATCH_TRANSFER'
  | 'SHOP_REQUEST_STOCK'
  | 'SHOP_INITIATE_TRANSFER'
  | 'SHOP_RECEIVE_TRANSFER'
  | 'RECORD_WASTAGE'
  | 'RECLASSIFY_STOCK';

const capabilitiesByRole: Readonly<Record<ApplicationRole, readonly Capability[]>> = {
  ADMIN: [
    'BUSINESS_ADMINISTER',
    'HUB_RECEIVE_PURCHASE',
    'HUB_MANAGE_SUPPLIERS',
    'HUB_MANAGE_REQUIREMENTS',
    'HUB_DISPATCH_TRANSFER',
    'SHOP_REQUEST_STOCK',
    'SHOP_INITIATE_TRANSFER',
    'SHOP_RECEIVE_TRANSFER',
    'RECORD_WASTAGE',
    'RECLASSIFY_STOCK',
  ],
  HUB_MANAGER: [
    'HUB_RECEIVE_PURCHASE',
    'HUB_MANAGE_SUPPLIERS',
    'HUB_MANAGE_REQUIREMENTS',
    'HUB_DISPATCH_TRANSFER',
  ],
  HUB_EMPLOYEE: ['HUB_RECEIVE_PURCHASE', 'HUB_DISPATCH_TRANSFER'],
  SHOP_MANAGER: [
    'SHOP_REQUEST_STOCK',
    'SHOP_INITIATE_TRANSFER',
    'SHOP_RECEIVE_TRANSFER',
    'RECORD_WASTAGE',
    'RECLASSIFY_STOCK',
  ],
  STOREKEEPER: ['SHOP_RECEIVE_TRANSFER', 'RECORD_WASTAGE'],
  // Compatibility role for accounts created before role specialization.
  SHOP_USER: [
    'SHOP_REQUEST_STOCK',
    'SHOP_INITIATE_TRANSFER',
    'SHOP_RECEIVE_TRANSFER',
    'RECORD_WASTAGE',
    'RECLASSIFY_STOCK',
  ],
};

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

export function hasCapability(actor: AuthenticatedActor, capability: Capability): boolean {
  return capabilitiesByRole[actor.role].includes(capability);
}

export function requireCapability(actor: AuthenticatedActor, capability: Capability): void {
  if (!hasCapability(actor, capability)) {
    throw new AccessDeniedError(`The actor is not authorized for capability ${capability}.`);
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
