import { z } from 'zod';

export const recordWastageInputSchema = z.object({
  locationId: z.uuid(),
  productId: z.uuid(),
  businessDate: z.iso.date(),
  quantityGrams: z.coerce.bigint().positive(),
  occurredAt: z.coerce.date(),
  reason: z.string().trim().min(1).max(320).optional(),
});

export type RecordWastageInput = z.infer<typeof recordWastageInputSchema>;
