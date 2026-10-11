import { z } from 'zod';

export const createSupplierInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(3).max(32).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;
