import { describe, expect, it } from 'vitest';
import { createPurchaseInputSchema } from './create-purchase-input.js';

describe('create purchase input', () => {
  const input = {
    supplierId: 'bb55607e-c16b-49d2-a884-b93ba53d9a33',
    receivingLocationId: 'd596cd98-2d4b-4fa4-80c8-f7cdf99cbdf1',
    purchaseDate: '2026-10-10',
    items: [
      {
        productId: 'bc61e25c-6d01-409d-a4bf-4cc94ff67ba9',
        quantityGrams: '1250',
        paisePerKg: '6000',
      },
    ],
  };

  it('parses exact gram and paise values as bigint', () => {
    const result = createPurchaseInputSchema.parse(input);
    expect(result.items[0]?.quantityGrams).toBe(1250n);
    expect(result.items[0]?.paisePerKg).toBe(6000n);
  });

  it('rejects duplicate products', () => {
    const result = createPurchaseInputSchema.safeParse({
      ...input,
      items: [input.items[0], input.items[0]],
    });
    expect(result.success).toBe(false);
  });
});
