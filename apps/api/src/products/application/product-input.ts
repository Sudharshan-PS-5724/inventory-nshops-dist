import { z } from 'zod';
import { validateRecoveryBasisPoints } from '../domain/product-rules.js';
import { exactInteger } from '../../shared/exact-integer.js';

export const createProductInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  productCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{1,64}$/),
  recoveryBasisPoints: z
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
  initialPricePaisePerKg: exactInteger.pipe(z.bigint().nonnegative()),
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;
