import { describe, expect, it } from 'vitest';
import { recordExpenseInputSchema } from './record-expense-input.js';

describe('record expense input', () => {
  it('allows a business-wide expense without a location and retains paise exactly', () => {
    const parsed = recordExpenseInputSchema.parse({
      expenseDate: '2026-10-10',
      category: 'Electricity',
      amountPaise: '12345',
    });
    expect(parsed.locationId).toBeUndefined();
    expect(parsed.amountPaise).toBe(12345n);
  });
});
