import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

const transferItemSchema = z.object({
  productId: z.uuid(),
  quantityGrams: exactInteger.pipe(z.bigint().positive()),
});

export const createTransferInputSchema = z
  .object({
    sourceLocationId: z.uuid(),
    destinationLocationId: z.uuid(),
    businessDate: z.iso.date(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(transferItemSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if (value.sourceLocationId === value.destinationLocationId) {
      context.addIssue({
        code: 'custom',
        message: 'Source and destination locations must differ.',
        path: ['destinationLocationId'],
      });
    }

    const productIds = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'A product may appear only once in a transfer.',
          path: ['items', index, 'productId'],
        });
      }
      productIds.add(item.productId);
    }
  });

export type CreateTransferInput = z.infer<typeof createTransferInputSchema>;
