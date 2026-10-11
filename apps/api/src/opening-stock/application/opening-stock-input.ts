import { z } from 'zod';

const openingStockLineSchema = z.object({
  productId: z.uuid(),
  quantityGrams: z.coerce.bigint().nonnegative(),
});

export const submitOpeningStockInputSchema = z
  .object({
    locationId: z.uuid(),
    businessDate: z.iso.date(),
    lines: z.array(openingStockLineSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    const productIds = new Set<string>();
    for (const [index, line] of value.lines.entries()) {
      if (productIds.has(line.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'A product may appear only once in an opening-stock submission.',
          path: ['lines', index, 'productId'],
        });
      }
      productIds.add(line.productId);
    }
  });

export type SubmitOpeningStockInput = z.infer<typeof submitOpeningStockInputSchema>;
