export function calculatePurchaseLineAmountPaise(
  quantityGrams: bigint,
  paisePerKg: bigint,
): bigint {
  if (quantityGrams <= 0n) {
    throw new RangeError('Purchase quantity must be positive.');
  }
  if (paisePerKg < 0n) {
    throw new RangeError('Purchase price must not be negative.');
  }

  // Convert grams at a per-kilogram rate to paise, rounding half up once per line.
  return (quantityGrams * paisePerKg + 500n) / 1_000n;
}
