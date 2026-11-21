import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

export const reclassifyStockInputSchema = z.object({
  locationId: z.uuid(),
  freshProductId: z.uuid(),
  discountedProductId: z.uuid(),
  businessDate: z.iso.date(),
  quantityGrams: exactInteger.pipe(z.bigint().positive()),
  occurredAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
});

export type ReclassifyStockInput = z.infer<typeof reclassifyStockInputSchema>;
