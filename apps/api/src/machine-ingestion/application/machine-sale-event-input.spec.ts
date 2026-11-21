import { describe, expect, it } from 'vitest';
import { machineSaleEventInputSchema } from './machine-sale-event-input.js';

describe('machine sale event input', () => {
  it('preserves machine quantities and money as exact integers', () => {
    const parsed = machineSaleEventInputSchema.parse({
      deviceId: '10000000-0000-4000-8000-000000000001',
      recordEpoch: 1,
      recordSequence: 42,
      occurredAt: '2026-11-21T10:30:00+05:30',
      pluCode: '01',
      quantityGrams: '1250',
      unitPricePaisePerKg: '4000',
      amountPaise: '5000',
      paymentMode: 'UPI',
      rawPayload: 'base64-machine-response',
    });

    expect(parsed.quantityGrams).toBe(1250n);
    expect(parsed.amountPaise).toBe(5000n);
  });

  it('rejects unbounded record counters and fractional quantities', () => {
    expect(
      machineSaleEventInputSchema.safeParse({
        deviceId: '10000000-0000-4000-8000-000000000001',
        recordEpoch: Number.MAX_SAFE_INTEGER + 1,
        recordSequence: 42,
        occurredAt: '2026-11-21T10:30:00+05:30',
        pluCode: '01',
        quantityGrams: '1.25',
        unitPricePaisePerKg: '4000',
        amountPaise: '5000',
        paymentMode: 'UPI',
        rawPayload: 'base64-machine-response',
      }),
    ).toMatchObject({ success: false });
  });
});
