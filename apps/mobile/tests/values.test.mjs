import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaled, kilograms, dateAt } from '../src/live/values.ts';
test('mobile entry converts kilograms and rupees exactly', () => {
  assert.equal(scaled('12.125', 3), '12125');
  assert.equal(scaled('35.50', 2), '3550');
  for (const bad of ['', '-1', '1e3', '0.0001', 'NaN']) assert.throws(() => scaled(bad, 3));
});
test('large and negative stock display does not lose integer precision', () => {
  assert.equal(kilograms('9007199254740993'), '9007199254740.993');
  assert.equal(kilograms('-1'), '-0.001');
});
test('business date uses the shop timezone', () => {
  assert.equal(dateAt('Asia/Kolkata', new Date('2026-10-18T20:00:00Z')), '2026-10-19');
});
