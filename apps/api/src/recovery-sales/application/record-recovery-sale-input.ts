import { z } from 'zod';

const itemSchema = z.object({ productId: z.uuid(), quantityGrams: z.coerce.bigint().positive() });

export const recordRecoverySaleInputSchema = z
  .object({
    locationId: z.uuid(),
    businessDate: z.iso.date(),
    soldAt: z.coerce.date(),
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
