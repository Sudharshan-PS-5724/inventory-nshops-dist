import { describe, expect, it } from 'vitest';
import { createTransferInputSchema, receiveTransferInputSchema } from './transfer-input.js';

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

  it('requires a reason when a storekeeper adjusts a receipt', () => {
    expect(
      receiveTransferInputSchema.safeParse({
        businessDate: '2026-11-21',
        occurredAt: '2026-11-21T10:00:00+05:30',
        decision: 'ADJUSTED',
        items: [
          {
            transferItemId: 'd596cd98-2d4b-4fa4-80c8-f7cdf99cbdf1',
            receivedGrams: '9500',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('uses exact integer grams for an accepted receipt', () => {
    const parsed = receiveTransferInputSchema.parse({
      businessDate: '2026-11-21',
      occurredAt: '2026-11-21T10:00:00+05:30',
      decision: 'ACCEPTED',
      items: [
        {
          transferItemId: 'd596cd98-2d4b-4fa4-80c8-f7cdf99cbdf1',
          receivedGrams: '10000',
        },
      ],
    });
    expect(parsed.items[0]!.receivedGrams).toBe(10000n);
  });
});
