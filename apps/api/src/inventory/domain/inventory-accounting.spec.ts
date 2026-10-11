import { describe, expect, it } from 'vitest';
import {
  calculateAvailableGrams,
  calculateRecoveryPricePaisePerKg,
  InsufficientInventoryError,
  requireSufficientInventory,
} from './inventory-accounting.js';

describe('inventory accounting', () => {
  it('calculates a daily available balance from the fresh opening baseline and same-day movements', () => {
    expect(
      calculateAvailableGrams(10_000n, [
        { quantityGrams: 2_000n },
        { quantityGrams: -1_500n },
        { quantityGrams: -300n },
      ]),
    ).toBe(10_200n);
  });

  it('rejects a deduction larger than the available balance', () => {
    expect(() => requireSufficientInventory(750n, 751n)).toThrow(InsufficientInventoryError);
  });

  it('calculates recovery price with exact integer half-up rounding', () => {
    expect(calculateRecoveryPricePaisePerKg(6_001n, 3_000)).toBe(1_800n);
    expect(calculateRecoveryPricePaisePerKg(1n, 5_000)).toBe(1n);
  });
});
