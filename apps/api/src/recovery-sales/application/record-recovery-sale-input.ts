import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

const itemSchema = z.object({
  productId: z.uuid(),
  quantityGrams: exactInteger.pipe(z.bigint().positive()),
});

export const recordRecoverySaleInputSchema = z
  .object({
    locationId: z.uuid(),
    businessDate: z.iso.date(),
    soldAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
    paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']),
    items: z.array(itemSchema).min(1).max(100),
  })
  .superRefine((value, context) => {
    const ids = new Set<string>();
    value.items.forEach((item, index) => {
      if (ids.has(item.productId))
        context.addIssue({
          code: 'custom',
          message: 'A product may appear only once.',
          path: ['items', index, 'productId'],
        });
      ids.add(item.productId);
    });
  });

export type RecordRecoverySaleInput = z.infer<typeof recordRecoverySaleInputSchema>;
