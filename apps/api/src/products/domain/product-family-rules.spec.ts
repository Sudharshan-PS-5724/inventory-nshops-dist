import { describe, expect, it } from 'vitest';
import {
  deriveDiscountedProductCode,
  InvalidProductFamilyCodeError,
  isFreshProductFamilyCode,
} from './product-family-rules.js';

describe('product family code rules', () => {
  it.each([
    ['01', '201'],
    ['99', '299'],
    ['100', '300'],
    ['200', '400'],
  ])('maps fresh code %s to discounted code %s', (freshCode, discountedCode) => {
    expect(deriveDiscountedProductCode(freshCode)).toBe(discountedCode);
  });

  it.each(['00', '201', '1', '001', 'FRUIT-1'])('rejects non-fresh code %s', (code) => {
    expect(isFreshProductFamilyCode(code)).toBe(false);
    expect(() => deriveDiscountedProductCode(code)).toThrow(InvalidProductFamilyCodeError);
  });
});
