import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectReceiptsForExport } from './receiptExport.js';

const receipts = [
  { id: 1, created_at: '2026-11-01T00:00:00' },
  { id: 2, created_at: '2026-11-30T23:59:59' },
  { id: 3, created_at: '2026-12-01T00:00:00' },
  { id: 4, created_at: null },
];

test('submission date range includes both boundaries and reports missing dates', () => {
  const result = selectReceiptsForExport(receipts, {
    scope: 'date', selectedIds: [], startDate: '2026-11-01', endDate: '2026-11-30',
  });
  assert.deepEqual(result.receipts.map((receipt) => receipt.id), [1, 2]);
  assert.equal(result.missingDates, 1);
  assert.equal(result.error, '');
});

test('selected scope exports only selected receipts in the current list', () => {
  const result = selectReceiptsForExport(receipts, {
    scope: 'selected', selectedIds: [2, 4, 99], startDate: '', endDate: '',
  });
  assert.deepEqual(result.receipts.map((receipt) => receipt.id), [2, 4]);
  assert.equal(selectReceiptsForExport(receipts, {
    scope: 'selected', selectedIds: [], startDate: '', endDate: '',
  }).error, 'No receipts match your export selection.');
});

test('invalid, reversed, and empty ranges report errors', () => {
  for (const [startDate, endDate] of [
    ['', '2026-11-30'],
    ['2026-02-30', '2026-11-30'],
    ['2026-12-01', '2026-11-30'],
    ['2025-01-01', '2025-01-31'],
  ]) {
    assert.ok(selectReceiptsForExport(receipts, {
      scope: 'date', selectedIds: [], startDate, endDate,
    }).error);
  }
});
