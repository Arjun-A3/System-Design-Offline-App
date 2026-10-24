import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, localDateISO } from '../src/engine/dates.ts';

test('local dates use the device calendar, not the UTC day', () => {
  const early = new Date(2026, 5, 15, 0, 30, 0);
  assert.equal(localDateISO(early), '2026-06-15');

  if (early.getTimezoneOffset() < 0) {
    assert.equal(early.toISOString().slice(0, 10), '2026-06-14');
  }

  const late = new Date(2026, 5, 15, 23, 30, 0);
  assert.equal(localDateISO(late), '2026-06-15');
  if (late.getTimezoneOffset() > 0) {
    assert.notEqual(late.toISOString().slice(0, 10), '2026-06-15');
  }
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
});
