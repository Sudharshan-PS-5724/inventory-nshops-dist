import { describe, expect, it } from 'vitest';
import { canonicalizeForIdempotency } from './idempotency.service.js';

describe('idempotency request semantics', () => {
  it('normalizes object field order before request fingerprinting', () => {
    expect(canonicalizeForIdempotency({ productCode: 'BANANA', price: '6000' })).toBe(
      canonicalizeForIdempotency({ price: '6000', productCode: 'BANANA' }),
    );
  });
});
