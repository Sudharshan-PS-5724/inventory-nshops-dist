import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

const requestedItemSchema = z.object({
  productId: z.uuid(),
  requestedGrams: exactInteger.pipe(z.bigint().positive()),
});

export const createStockRequirementInputSchema = z
  .object({
    shopId: z.uuid(),
    items: z.array(requestedItemSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'productId'],
          message: 'A product may appear only once in a stock requirement.',
        });
      }
      seen.add(item.productId);
    }
  });

const approvalItemSchema = z.object({
  itemId: z.uuid(),
  approvedGrams: exactInteger.pipe(z.bigint().nonnegative()),
});

export const reviewStockRequirementInputSchema = z
  .object({
    status: z.enum(['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED']),
    reason: z.string().trim().min(1).max(500).optional(),
    items: z.array(approvalItemSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if (value.status === 'REJECTED' && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'A rejection reason is required.',
      });
    }
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.itemId)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'itemId'],
          message: 'An item may appear only once in a review.',
        });
      }
      seen.add(item.itemId);
    }
  });

export type CreateStockRequirementInput = z.infer<typeof createStockRequirementInputSchema>;
export type ReviewStockRequirementInput = z.infer<typeof reviewStockRequirementInputSchema>;
