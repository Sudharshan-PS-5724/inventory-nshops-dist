import { z } from 'zod';

export const changePriceInputSchema = z.object({
  paisePerKg: z.coerce.bigint().nonnegative(),
});

export type ChangePriceInput = z.infer<typeof changePriceInputSchema>;
