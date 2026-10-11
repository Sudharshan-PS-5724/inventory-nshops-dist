import { z } from 'zod';
import { normalizeProductCode, validateRecoveryBasisPoints } from '../domain/product-rules.js';

export const createProductInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  productCode: z.string().transform(normalizeProductCode),
  recoveryBasisPoints: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000)
    .superRefine((value, context) => {
      try {
        validateRecoveryBasisPoints(value);
      } catch (error) {
        context.addIssue({ code: 'custom', message: (error as Error).message });
      }
    }),
  initialPricePaisePerKg: z.coerce.bigint().nonnegative(),
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;
