import { describe, expect, it } from 'vitest';
import { submitOpeningStockInputSchema } from './opening-stock-input.js';

describe('opening stock input', () => {
  it('rejects duplicate products in one physical count', () => {
    const parsed = submitOpeningStockInputSchema.safeParse({
      locationId: '4dbce1b0-ca8c-4a9e-b9ad-ff8039710183',
      businessDate: '2026-10-10',
      lines: [
        { productId: '8c013560-96dd-4e92-b280-f560ced0f7c5', quantityGrams: '1000' },
        { productId: '8c013560-96dd-4e92-b280-f560ced0f7c5', quantityGrams: '500' },
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
