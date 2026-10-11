import { describe, expect, it } from 'vitest';
import { sortedTransferLockKeys } from './transfer-locks.js';

describe('transfer locks', () => {
  it('sorts locks deterministically to prevent inverse-order deadlocks', () => {
    expect(
      sortedTransferLockKeys([
        { locationId: 'shop-b', productId: 'banana', businessDate: '2026-10-10' },
        { locationId: 'shop-a', productId: 'apple', businessDate: '2026-10-10' },
      ]),
    ).toEqual(['shop-a:apple:2026-10-10', 'shop-b:banana:2026-10-10']);
  });
});
