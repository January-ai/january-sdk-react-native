/**
 * The arithmetic behind the Tracking charts, kept free of React so it can be
 * tested on its own: which dates a range covers, how a long range is split
 * into requests, how daily water totals become bars, and how weights logged
 * in either unit become one line.
 */
import { localIsoDate, shiftIsoDate } from './localDate';

/** Each range ends today, whatever day the Tracking day picker shows. */
export type ChartRange = 'week' | 'month' | 'year';

export const chartRanges: readonly { id: ChartRange; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export interface DateRange {
  end: string;
  start: string;
}

/**
 * The longest span one list request asks for. The API answers with at most
 * 100 days, so a longer range is split into pieces of this size.
 */
export const maxDaysPerRequest = 90;

export const POUNDS_TO_KILOGRAMS = 0.45359237;

const rangePhrase: Record<ChartRange, string> = {
  week: 'last 7 days',
  month: 'last 30 days',
  year: 'last 12 months',
};

/**
 * The inclusive local dates a range covers. Week is the last 7 days and Month
 * the last 30, both including today; Year is the last 12 calendar months, from
 * the first of the month eleven months back through today.
 */
export function resolveChartRange(
  range: ChartRange,
  now: Date = new Date()
): DateRange {
  const end = localIsoDate(now);
  if (range === 'week') return { start: shiftIsoDate(end, -6), end };
  if (range === 'month') return { start: shiftIsoDate(end, -29), end };
  const first = new Date(now.getFullYear(), now.getMonth() - 11, 1, 12);
  return { start: localIsoDate(first), end };
}

/** Every date from `start` through `end`, inclusive. */
export function daysIn({ start, end }: DateRange): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = shiftIsoDate(day, 1)) days.push(day);
  return days;
}

/** Consecutive, non-overlapping pieces of at most `maxDays` days, oldest first. */
export function chunkDateRange(
  range: DateRange,
  maxDays: number = maxDaysPerRequest
): DateRange[] {
  if (!Number.isInteger(maxDays) || maxDays < 1) {
    throw new RangeError('maxDays must be a whole number of at least 1.');
  }
  const chunks: DateRange[] = [];
  let start = range.start;
  while (start <= range.end) {
    const last = shiftIsoDate(start, maxDays - 1);
    const end = last < range.end ? last : range.end;
    chunks.push({ start, end });
    start = shiftIsoDate(end, 1);
  }
  return chunks;
}

/** One item per date across the chunks' answers, oldest first. */
export function mergeDailyItems<T extends { date: string }>(
  pages: readonly (readonly T[])[]
): T[] {
  const byDate = new Map<string, T>();
  for (const items of pages)
    for (const item of items) byDate.set(item.date, item);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetches a range one chunk at a time, in order, and merges the answers.
 * Sequential on purpose: a year is five small requests, not a burst.
 */
export async function fetchInChunks<T extends { date: string }>(
  range: DateRange,
  fetchChunk: (chunk: DateRange) => Promise<readonly T[]>
): Promise<T[]> {
  const pages: (readonly T[])[] = [];
  for (const chunk of chunkDateRange(range))
    pages.push(await fetchChunk(chunk));
  return mergeDailyItems(pages);
}

export interface ChartBar {
  /** A date for a daily bar, `YYYY-MM` for a monthly one. */
  key: string;
  logged: boolean;
  /** The first date the bar covers. */
  start: string;
  value: number;
}

type DailyTotal = { date: string; total: { value: number } };

/** One bar per day of the range; a day with nothing logged is an empty slot. */
export function dailyBars(
  items: readonly DailyTotal[],
  range: DateRange
): ChartBar[] {
  const totals = new Map(items.map((item) => [item.date, item.total.value]));
  return daysIn(range).map((day) => ({
    key: day,
    start: day,
    value: totals.get(day) ?? 0,
    logged: totals.has(day),
  }));
}

/** One bar per calendar month the range touches, the sum of its daily totals. */
export function monthlyBars(
  items: readonly DailyTotal[],
  range: DateRange
): ChartBar[] {
  const bars = new Map<string, ChartBar>();
  const last = range.end.slice(0, 7);
  for (let month = range.start.slice(0, 7); month <= last;) {
    bars.set(month, {
      key: month,
      start: `${month}-01`,
      value: 0,
      logged: false,
    });
    month = nextMonth(month);
  }
  for (const item of items) {
    if (item.date < range.start || item.date > range.end) continue;
    const bar = bars.get(item.date.slice(0, 7));
    if (!bar) continue;
    bar.value += item.total.value;
    bar.logged = true;
  }
  return [...bars.values()].map((bar) => ({
    ...bar,
    value: roundTo(bar.value, 3),
  }));
}

/** Daily bars for Week and Month, monthly bars for Year. */
export function waterBars(
  items: readonly DailyTotal[],
  range: ChartRange,
  dates: DateRange
): ChartBar[] {
  return range === 'year' ? monthlyBars(items, dates) : dailyBars(items, dates);
}

function nextMonth(month: string): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, index!, 1));
  return date.toISOString().slice(0, 7);
}

/** A weight in `to`, from `lb` or `kg`. A unit it does not know is kept as is. */
export function convertWeight(value: number, from: string, to: string): number {
  if (from === to) return value;
  if (from === 'lb' && to === 'kg') return value * POUNDS_TO_KILOGRAMS;
  if (from === 'kg' && to === 'lb') return value / POUNDS_TO_KILOGRAMS;
  return value;
}

export interface WeightPoint {
  date: string;
  value: number;
}

/** The range's daily weights, each converted to `unit`, oldest first. */
export function weightPoints(
  items: readonly { date: string; weight: { unit: string; value: number } }[],
  range: DateRange,
  unit: string
): WeightPoint[] {
  return items
    .filter((item) => item.date >= range.start && item.date <= range.end)
    .map((item) => ({
      date: item.date,
      value: convertWeight(item.weight.value, item.weight.unit, unit),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Whole days from `start` to `day`, for placing a date on a time axis. */
export function dayOffset(start: string, day: string): number {
  return Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000
  );
}

/** A round axis maximum at or above `value`: 1, 2, 2.5, or 5 times a power of ten. */
export function niceCeiling(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value);
  return roundTo((step ?? 10) * power, 6);
}

export function formatChartValue(value: number, digits = 1): string {
  return roundTo(value, digits).toLocaleString('en-US', {
    maximumFractionDigits: digits,
  });
}

export type ChartDateStyle = 'weekday' | 'day' | 'month' | 'monthYear' | 'full';

export function formatChartDate(day: string, style: ChartDateStyle): string {
  const options: Record<ChartDateStyle, Intl.DateTimeFormatOptions> = {
    weekday: { weekday: 'short' },
    day: { month: 'short', day: 'numeric' },
    month: { month: 'short' },
    monthYear: { month: 'short', year: 'numeric' },
    full: { weekday: 'short', month: 'short', day: 'numeric' },
  };
  // Noon UTC formatted in UTC keeps the calendar date in every timezone.
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    ...options[style],
    timeZone: 'UTC',
  });
}

/**
 * The few axis labels a chart shows, as indexes into its bars or days: every
 * day for a week, every 7th day for a month, every 3rd month for a year, and
 * always the last one (today).
 */
export function axisLabelIndexes(count: number, range: ChartRange): number[] {
  if (count <= 0) return [];
  const step = range === 'week' ? 1 : range === 'month' ? 7 : 3;
  const indexes: number[] = [];
  for (let index = count - 1; index >= 0; index -= step) indexes.unshift(index);
  return indexes;
}

/** "Weight, last 7 days: 3 entries, from 70.2 kg to 69.8 kg, lowest …". */
export function weightSummary(
  points: readonly WeightPoint[],
  range: ChartRange,
  unit: string
): string {
  const prefix = `Weight, ${rangePhrase[range]}`;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return `${prefix}: no entries`;
  const format = (value: number) => `${formatChartValue(value)} ${unit}`;
  if (points.length === 1) return `${prefix}: 1 entry, ${format(first.value)}`;
  const values = points.map((point) => point.value);
  return (
    `${prefix}: ${points.length} entries, from ${format(first.value)} to ` +
    `${format(last.value)}, lowest ${format(Math.min(...values))}, ` +
    `highest ${format(Math.max(...values))}`
  );
}

/** "Water, last 7 days: 5 of 7 days logged, 120 fl oz in total, most …". */
export function waterSummary(
  bars: readonly ChartBar[],
  range: ChartRange,
  unitLabel: string
): string {
  const prefix = `Water, ${rangePhrase[range]}`;
  const logged = bars.filter((bar) => bar.logged);
  const most = logged.reduce<ChartBar | undefined>(
    (best, bar) => (!best || bar.value > best.value ? bar : best),
    undefined
  );
  if (!most) return `${prefix}: nothing logged`;
  const total = roundTo(
    bars.reduce((sum, bar) => sum + bar.value, 0),
    3
  );
  const year = range === 'year';
  const when = formatChartDate(most.start, year ? 'monthYear' : 'full');
  return (
    `${prefix}: ${logged.length} of ${bars.length} ${year ? 'months' : 'days'} ` +
    `logged, ${formatChartValue(total)} ${unitLabel} in total, most ` +
    `${formatChartValue(most.value)} ${unitLabel} ${year ? 'in' : 'on'} ${when}`
  );
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
