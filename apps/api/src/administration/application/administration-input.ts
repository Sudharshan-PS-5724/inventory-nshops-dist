import { z } from 'zod';

export const createShopInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(64),
});

export const createShopUserInputSchema = z.object({
  authUserId: z.uuid(),
  displayName: z.string().trim().min(1).max(160),
});

export const assignShopUserInputSchema = z.object({
  shopId: z.uuid(),
});

export type CreateShopInput = z.infer<typeof createShopInputSchema>;
export type CreateShopUserInput = z.infer<typeof createShopUserInputSchema>;
export type AssignShopUserInput = z.infer<typeof assignShopUserInputSchema>;
