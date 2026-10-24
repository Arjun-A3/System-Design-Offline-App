/** Local calendar dates. Never use `Date.toISOString()` for a learner's day. */

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDateISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

export function compareDates(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function isOnOrBefore(left: string, right: string): boolean {
  return compareDates(left, right) <= 0;
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part));
  const date = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return localDateISO(date);
}

export function weekdayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day).getDay();
}

export function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (compareDates(cursor, end) <= 0) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}
