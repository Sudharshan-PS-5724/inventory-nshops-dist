import { z } from 'zod';
import { exactInteger } from '../../shared/exact-integer.js';

export const recordExpenseInputSchema = z.object({
  locationId: z.uuid().optional(),
  expenseDate: z.iso.date(),
  category: z.string().trim().min(1).max(80),
  amountPaise: exactInteger.pipe(z.bigint().nonnegative()),
  description: z.string().trim().min(1).max(500).optional(),
});

export type RecordExpenseInput = z.infer<typeof recordExpenseInputSchema>;
