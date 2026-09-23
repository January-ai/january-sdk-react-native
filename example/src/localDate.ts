/**
 * Calendar dates for requests, on the device's own calendar.
 *
 * The API reads every `YYYY-MM-DD` in the client's IANA timezone, and the demo
 * configures its client with the device's zone. So "today" has to be the
 * device's local date: `toISOString()` gives the UTC date, which in the
 * Americas is already tomorrow by the evening.
 */

/** The device's IANA timezone, such as `America/Chicago`; `UTC` if unknown. */
export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.length > 0 ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The local calendar date (`YYYY-MM-DD`) of an instant, today by default. */
export function localIsoDate(value: Date = new Date()): string {
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The local calendar date of an ISO-8601 date-time such as a log's UTC time. */
export function localDayOf(timestamp: string): string {
  return localIsoDate(new Date(timestamp));
}

/** A calendar date moved by whole days. Pure date arithmetic, no timezone. */
export function shiftIsoDate(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * When to date something logged for `day`: now for today, otherwise local noon
 * on that day, which stays on that date in the device's timezone.
 */
export function timestampForDay(day: string, now: Date = new Date()): string {
  if (day === localIsoDate(now)) return now.toISOString();
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year!, month! - 1, date!, 12).toISOString();
}
