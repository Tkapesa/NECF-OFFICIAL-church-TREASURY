const isCalendarDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export function selectReceiptsForExport(receipts, { scope, selectedIds, startDate, endDate }) {
  let matches;
  let missingDates = 0;

  if (scope === 'selected') {
    const selected = new Set(selectedIds);
    matches = receipts.filter((receipt) => selected.has(receipt.id));
  } else if (scope === 'date') {
    if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
      return { receipts: [], missingDates, error: 'Enter a valid start and end date.' };
    }
    if (startDate > endDate) {
      return { receipts: [], missingDates, error: 'The start date must be on or before the end date.' };
    }
    matches = receipts.filter((receipt) => {
      const date = typeof receipt.created_at === 'string' ? receipt.created_at.slice(0, 10) : '';
      if (!isCalendarDate(date)) {
        missingDates += 1;
        return false;
      }
      return date >= startDate && date <= endDate;
    });
  } else if (scope === 'all') {
    matches = receipts;
  } else {
    return { receipts: [], missingDates, error: 'Choose which receipts to export.' };
  }

  return {
    receipts: matches,
    missingDates,
    error: matches.length ? '' : 'No receipts match your export selection.',
  };
}
