export function fmtDate(date) {
  return date.toISOString().split('T')[0];
}

export function thaiShortDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short'
  });
}

export function thaiLongDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function dateRange(from, to) {
  const days = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    days.push(fmtDate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function formatDbTime(value) {
  if (!value) return null;
  const text = String(value);
  if (text.includes('T')) return text.split('T')[1].slice(0, 5);
  return text.slice(0, 5);
}

export function numberTH(value) {
  return Number(value || 0).toLocaleString('th-TH');
}
