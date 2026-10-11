import { describe, expect, it } from 'vitest';
import { recordWastageInputSchema } from './record-wastage-input.js';

describe('record wastage input', () => {
  it('requires a positive, exact quantity and explicit business date', () => {
    const parsed = recordWastageInputSchema.parse({
      locationId: '4a43bdc3-a730-4f75-bb54-da0e3314d45d',
      productId: '7f5d7881-0d9d-4221-a968-cfd47b4e3e54',
      businessDate: '2026-10-10',
      quantityGrams: '1250',
      occurredAt: '2026-10-10T10:30:00.000Z',
    });
    expect(parsed.quantityGrams).toBe(1250n);
    expect(parsed.occurredAt).toEqual(new Date('2026-10-10T10:30:00.000Z'));
  });
});
