import { describe, expect, it } from 'vitest';
import {
  InvalidProductInputError,
  normalizeProductCode,
  validatePricePaisePerKg,
  validateRecoveryBasisPoints,
} from './product-rules.js';

describe('product rules', () => {
  it('normalizes a valid product code', () => {
    expect(normalizeProductCode(' banana_green-01 ')).toBe('BANANA_GREEN-01');
  });

  it('rejects an unsafe product code and invalid recovery percentage', () => {
    expect(() => normalizeProductCode('banana/green')).toThrow(InvalidProductInputError);
    expect(() => validateRecoveryBasisPoints(10_001)).toThrow(InvalidProductInputError);
  });

  it('rejects a negative selling price', () => {
    expect(() => validatePricePaisePerKg(-1n)).toThrow(InvalidProductInputError);
  });
});
