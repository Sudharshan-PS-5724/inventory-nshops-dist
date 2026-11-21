import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';
import { isFreshProductFamilyCode } from '../domain/product-family-rules.js';

export const createProductFamilyInputSchema = z.object({
  freshName: z.string().trim().min(1).max(160),
  freshProductCode: z.string().trim().refine(isFreshProductFamilyCode, {
    message: 'Fresh product code must be a two or three digit value from 01 through 200.',
  }),
  discountedName: z.string().trim().min(1).max(160).optional(),
  freshInitialPricePaisePerKg: exactInteger.pipe(z.bigint().nonnegative()),
  discountedInitialPricePaisePerKg: exactInteger.pipe(z.bigint().nonnegative()),
});

export type CreateProductFamilyInput = z.infer<typeof createProductFamilyInputSchema>;
