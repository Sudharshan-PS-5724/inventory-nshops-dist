import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

const safeCounter = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const machineSaleEventInputSchema = z
  .object({
    deviceId: z.uuid(),
    recordEpoch: safeCounter,
    recordSequence: safeCounter,
    occurredAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
    pluCode: z
      .string()
      .trim()
      .regex(/^\d{1,64}$/),
    quantityGrams: exactInteger.pipe(z.bigint().positive()),
    unitPricePaisePerKg: exactInteger.pipe(z.bigint().nonnegative()),
    amountPaise: exactInteger.pipe(z.bigint().nonnegative()),
    paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'OTHER']),
    // The collector must preserve the raw machine reply, encoded as UTF-8 text or Base64.
    rawPayload: z.string().min(1).max(100_000),
  })
  .strict();

export type MachineSaleEventInput = z.infer<typeof machineSaleEventInputSchema>;
