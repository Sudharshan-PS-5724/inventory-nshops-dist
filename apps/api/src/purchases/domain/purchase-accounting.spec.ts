import { describe, expect, it } from 'vitest';
import { calculatePurchaseLineAmountPaise } from './purchase-accounting.js';

describe('purchase accounting', () => {
  it('calculates exact line amounts using grams and half-up paise rounding', () => {
    expect(calculatePurchaseLineAmountPaise(1_250n, 6_000n)).toBe(7_500n);
    expect(calculatePurchaseLineAmountPaise(1n, 500n)).toBe(1n);
    expect(calculatePurchaseLineAmountPaise(1n, 499n)).toBe(0n);
  });
});
