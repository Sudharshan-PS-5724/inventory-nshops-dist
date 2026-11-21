import { describe, expect, it } from 'vitest';
import { reclassifyStockInputSchema } from './stock-classification-input.js';

describe('stock reclassification input', () => {
  it('requires exact positive grams and an offset timestamp', () => {
    const value = reclassifyStockInputSchema.parse({
      locationId: '10000000-0000-4000-8000-000000000001',
      freshProductId: '10000000-0000-4000-8000-000000000002',
      discountedProductId: '10000000-0000-4000-8000-000000000003',
      businessDate: '2026-11-21',
      quantityGrams: '500',
      occurredAt: '2026-11-21T10:00:00+05:30',
    });
    expect(value.quantityGrams).toBe(500n);
  });

  it('rejects an unsafe fractional gram quantity', () => {
    expect(
      reclassifyStockInputSchema.safeParse({
        locationId: '10000000-0000-4000-8000-000000000001',
        freshProductId: '10000000-0000-4000-8000-000000000002',
        discountedProductId: '10000000-0000-4000-8000-000000000003',
        businessDate: '2026-11-21',
        quantityGrams: '500.5',
        occurredAt: '2026-11-21T10:00:00+05:30',
      }).success,
    ).toBe(false);
  });
});
