import { describe, expect, it } from 'vitest';
import { createProductInputSchema } from './product-input.js';

describe('create product input', () => {
  it('normalizes product code and preserves exact paise price', () => {
    const input = createProductInputSchema.parse({
      name: 'Green Banana',
      productCode: ' green-banana ',
      recoveryBasisPoints: 3000,
      initialPricePaisePerKg: '6000',
    });

    expect(input.productCode).toBe('GREEN-BANANA');
    expect(input.initialPricePaisePerKg).toBe(6000n);
  });
});
