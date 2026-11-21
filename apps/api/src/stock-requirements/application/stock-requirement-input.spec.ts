import { describe, expect, it } from 'vitest';
import {
  createStockRequirementInputSchema,
  reviewStockRequirementInputSchema,
} from './stock-requirement-input.js';

const productId = '10000000-0000-4000-8000-000000000001';
const itemId = '10000000-0000-4000-8000-000000000002';

describe('stock requirement input', () => {
  it('rejects duplicate product requests before persistence', () => {
    expect(
      createStockRequirementInputSchema.safeParse({
        shopId: '10000000-0000-4000-8000-000000000003',
        items: [
          { productId, requestedGrams: '1000' },
          { productId, requestedGrams: '2000' },
        ],
      }).success,
    ).toBe(false);
  });

  it('requires a reason for a rejected requirement', () => {
    expect(
      reviewStockRequirementInputSchema.safeParse({
        status: 'REJECTED',
        items: [{ itemId, approvedGrams: '0' }],
      }).success,
    ).toBe(false);
  });

  it('accepts an exact approved integer quantity', () => {
    const parsed = reviewStockRequirementInputSchema.parse({
      status: 'PARTIALLY_APPROVED',
      items: [{ itemId, approvedGrams: '1250' }],
    });
    expect(parsed.items[0]!.approvedGrams).toBe(1250n);
  });
});
