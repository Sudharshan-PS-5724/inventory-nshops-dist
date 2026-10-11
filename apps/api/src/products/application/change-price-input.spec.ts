import { describe, expect, it } from 'vitest';
import { changePriceInputSchema } from './change-price-input.js';

describe('change price input', () => {
  it('accepts an exact non-negative paise value', () => {
    expect(changePriceInputSchema.parse({ paisePerKg: '6250' }).paisePerKg).toBe(6250n);
  });

  it('rejects a negative selling price', () => {
    expect(changePriceInputSchema.safeParse({ paisePerKg: '-1' }).success).toBe(false);
  });
});
