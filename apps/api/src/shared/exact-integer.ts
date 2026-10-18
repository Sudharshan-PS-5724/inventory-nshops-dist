import { z } from 'zod';

// JSON clients should send decimal strings. Safe integers remain supported for compatibility.
export const exactInteger = z
  .union([
    z.string().regex(/^-?\d+$/),
    z.number().int().refine(Number.isSafeInteger, 'Use a decimal string for large integers.'),
    z.bigint(),
  ])
  .transform((value) => BigInt(value))
  .pipe(z.bigint().min(-9223372036854775808n).max(9223372036854775807n));
