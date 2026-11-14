const formatTurkishDate = (year, month, day) => {
  const parsedDate = new Date(year, month - 1, day, 12);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }
  return parsedDate.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function formatReceiptAmount(value) {
  if (value === null || value === undefined || value === '') return 'Not detected';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Not detected';

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatReceiptDate(value) {
  if (!value) return 'Not detected';
  const input = String(value).trim();

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
  if (match) {
    const [, year, month, day] = match.map(Number);
    return formatTurkishDate(year, month, day) || input;
  }

  match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec(input);
  if (match) {
    let [, first, second, year] = match.map(Number);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    const monthFirst = first <= 12 && second > 12;
    const month = monthFirst ? first : second;
    const day = monthFirst ? second : first;
    return formatTurkishDate(year, month, day) || input;
  }

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) return input;
  return parsedDate.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
