import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

const purchaseItemSchema = z.object({
  productId: z.uuid(),
  quantityGrams: exactInteger.pipe(z.bigint().positive()),
  paisePerKg: exactInteger.pipe(z.bigint().nonnegative()),
});

export const createPurchaseInputSchema = z
  .object({
    supplierId: z.uuid(),
    receivingLocationId: z.uuid(),
    purchaseDate: z.iso.date(),
    notes: z.string().trim().max(1_000).optional(),
    items: z.array(purchaseItemSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    const productIds = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'A product may appear only once in a purchase.',
          path: ['items', index, 'productId'],
        });
      }
      productIds.add(item.productId);
    }
  });

export type CreatePurchaseInput = z.infer<typeof createPurchaseInputSchema>;
