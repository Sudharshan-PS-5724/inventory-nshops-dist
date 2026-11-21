import { describe, expect, it } from 'vitest';
import { createProductFamilyInputSchema } from './product-family-input.js';

describe('create product family input', () => {
  it('preserves prices as exact integers and accepts a reserved fresh code', () => {
    const input = createProductFamilyInputSchema.parse({
      freshName: 'Tomato',
      freshProductCode: '01',
      freshInitialPricePaisePerKg: '6000',
      discountedInitialPricePaisePerKg: '3500',
    });

    expect(input.freshInitialPricePaisePerKg).toBe(6000n);
    expect(input.discountedInitialPricePaisePerKg).toBe(3500n);
  });

  it('rejects an out-of-range fresh family code', () => {
    expect(() =>
      createProductFamilyInputSchema.parse({
        freshName: 'Tomato',
        freshProductCode: '201',
        freshInitialPricePaisePerKg: '6000',
        discountedInitialPricePaisePerKg: '3500',
      }),
    ).toThrow();
  });
});
