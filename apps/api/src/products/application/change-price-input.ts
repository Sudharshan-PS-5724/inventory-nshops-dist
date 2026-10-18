import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

export const changePriceInputSchema = z.object({
  paisePerKg: exactInteger.pipe(z.bigint().nonnegative()),
});

export type ChangePriceInput = z.infer<typeof changePriceInputSchema>;
