import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

export const recordWastageInputSchema = z.object({
  locationId: z.uuid(),
  productId: z.uuid(),
  businessDate: z.iso.date(),
  quantityGrams: exactInteger.pipe(z.bigint().positive()),
  occurredAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  reason: z.string().trim().min(1).max(320).optional(),
});

export type RecordWastageInput = z.infer<typeof recordWastageInputSchema>;
