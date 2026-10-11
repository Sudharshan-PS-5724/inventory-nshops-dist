import { describe, expect, it } from 'vitest';
import { createTransferInputSchema } from './transfer-input.js';

describe('transfer input', () => {
  it('rejects a same-location transfer', () => {
    const locationId = '4dbce1b0-ca8c-4a9e-b9ad-ff8039710183';
    expect(
      createTransferInputSchema.safeParse({
        sourceLocationId: locationId,
        destinationLocationId: locationId,
        businessDate: '2026-10-10',
        items: [{ productId: '8c013560-96dd-4e92-b280-f560ced0f7c5', quantityGrams: 1000 }],
      }).success,
    ).toBe(false);
  });
});
