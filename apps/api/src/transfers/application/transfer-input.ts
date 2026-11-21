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

export const dispatchTransferInputSchema = createTransferInputSchema.extend({
  requirementId: z.uuid().optional(),
});

const receiptItemSchema = z.object({
  transferItemId: z.uuid(),
  receivedGrams: exactInteger.pipe(z.bigint().nonnegative()),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const receiveTransferInputSchema = z
  .object({
    businessDate: z.iso.date(),
    occurredAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
    decision: z.enum(['ACCEPTED', 'REJECTED', 'ADJUSTED']),
    reason: z.string().trim().min(1).max(500).optional(),
    items: z.array(receiptItemSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if ((value.decision === 'REJECTED' || value.decision === 'ADJUSTED') && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'A receipt reason is required.',
      });
    }
    const seen = new Set<string>();
    for (const [index, item] of value.items.entries()) {
      if (seen.has(item.transferItemId)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'transferItemId'],
          message: 'A transfer item may appear only once in a receipt.',
        });
      }
      seen.add(item.transferItemId);
    }
  });

export type DispatchTransferInput = z.infer<typeof dispatchTransferInputSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferInputSchema>;
