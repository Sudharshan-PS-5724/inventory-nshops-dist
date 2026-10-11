export interface InventoryMovementInput {
  readonly quantityGrams: bigint;
}

export class InsufficientInventoryError extends Error {
  constructor(
    readonly availableGrams: bigint,
    readonly requestedGrams: bigint,
  ) {
    super(
      `Insufficient inventory: ${availableGrams.toString()}g available, ${requestedGrams.toString()}g requested.`,
    );
    this.name = 'InsufficientInventoryError';
  }
}

export function calculateAvailableGrams(
  openingGrams: bigint,
  acceptedMovements: readonly InventoryMovementInput[],
): bigint {
  if (openingGrams < 0n) {
    throw new RangeError('Opening stock cannot be negative.');
  }

  return acceptedMovements.reduce(
    (availableGrams, movement) => availableGrams + movement.quantityGrams,
    openingGrams,
  );
}

export function requireSufficientInventory(availableGrams: bigint, requestedGrams: bigint): void {
  if (requestedGrams <= 0n) {
    throw new RangeError('Requested inventory quantity must be positive.');
  }

  if (availableGrams < requestedGrams) {
    throw new InsufficientInventoryError(availableGrams, requestedGrams);
  }
}

export function calculateRecoveryPricePaisePerKg(
  normalPricePaisePerKg: bigint,
  recoveryBasisPoints: number,
): bigint {
  if (normalPricePaisePerKg < 0n) {
    throw new RangeError('Normal selling price cannot be negative.');
  }
  if (
    !Number.isInteger(recoveryBasisPoints) ||
    recoveryBasisPoints < 0 ||
    recoveryBasisPoints > 10_000
  ) {
    throw new RangeError('Recovery basis points must be an integer from 0 through 10000.');
  }

  // Round half up to the nearest paise; never use binary floating point for money.
  return (normalPricePaisePerKg * BigInt(recoveryBasisPoints) + 5_000n) / 10_000n;
}
