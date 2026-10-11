import { z } from 'zod';

export const availabilityInputSchema = z.object({
  locationId: z.uuid(),
  businessDate: z.iso.date(),
});

export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;
