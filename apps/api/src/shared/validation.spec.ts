import { describe, expect, it } from 'vitest';
import { exactInteger } from './exact-integer.js';
import { assertBusinessDate, isTimezone } from './business-date.js';
import { createProductInputSchema } from '../products/application/product-input.js';
import { validateEnvironment } from '../config/environment.js';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';

describe('regression: strict input boundaries', () => {
  it.each([
    true,
    false,
    null,
    '',
    '1e3',
    '1.5',
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    '9223372036854775808',
  ])('rejects invalid integer %s', (value) => {
    expect(exactInteger.safeParse(value).success).toBe(false);
  });
  it('preserves exact supported integers', () => {
    expect(exactInteger.parse('9007199254740993')).toBe(9007199254740993n);
  });
  it('reports invalid product codes without throwing from safeParse', () => {
    expect(
      createProductInputSchema.safeParse({
        name: 'A',
        productCode: 'bad code',
        recoveryBasisPoints: 100,
        initialPricePaisePerKg: '1',
      }).success,
    ).toBe(false);
  });
  it('accepts the checked-in environment example including blank optional DSN', () => {
    expect(validateEnvironment(parse(readFileSync('.env.example'))).SENTRY_DSN).toBeUndefined();
  });
  it('validates IANA timezones', () => {
    expect(isTimezone('Asia/Kolkata')).toBe(true);
    expect(isTimezone('Not/AZone')).toBe(false);
  });
  it('derives the date across the UTC midnight boundary', () => {
    expect(() =>
      assertBusinessDate('2026-10-19', new Date('2026-10-18T20:00:00Z'), 'Asia/Kolkata'),
    ).not.toThrow();
    expect(() =>
      assertBusinessDate('2026-10-18', new Date('2026-10-18T20:00:00Z'), 'Asia/Kolkata'),
    ).toThrow();
  });
});
