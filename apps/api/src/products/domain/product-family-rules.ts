export class InvalidProductFamilyCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProductFamilyCodeError';
  }
}

/**
 * SRS product families reserve 01..200 for fresh stock and map them to
 * 201..400 for their independently-priced discounted counterpart.
 */
export function isFreshProductFamilyCode(value: string): boolean {
  return /^(0[1-9]|[1-9][0-9]|1[0-9]{2}|200)$/.test(value);
}

export function deriveDiscountedProductCode(freshProductCode: string): string {
  if (!isFreshProductFamilyCode(freshProductCode)) {
    throw new InvalidProductFamilyCodeError(
      'Fresh product code must be a two or three digit value from 01 through 200.',
    );
  }

  return String(Number.parseInt(freshProductCode, 10) + 200).padStart(3, '0');
}
