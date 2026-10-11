export class InvalidProductInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProductInputError';
  }
}

export function normalizeProductCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,64}$/.test(normalized)) {
    throw new InvalidProductInputError(
      'Product code must contain 1 to 64 uppercase letters, digits, underscores, or hyphens.',
    );
  }
  return normalized;
}

export function validateRecoveryBasisPoints(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new InvalidProductInputError(
      'Recovery basis points must be an integer from 0 through 10000.',
    );
  }
}

export function validatePricePaisePerKg(value: bigint): void {
  if (value < 0n) {
    throw new InvalidProductInputError('Selling price cannot be negative.');
  }
}
