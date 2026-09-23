import { describe, expect, it, jest } from '@jest/globals';

import {
  axisLabelIndexes,
  chunkDateRange,
  convertWeight,
  dailyBars,
  daysIn,
  fetchInChunks,
  formatChartValue,
  mergeDailyItems,
  monthlyBars,
  niceCeiling,
  resolveChartRange,
  waterBars,
  waterSummary,
  weightPoints,
  weightSummary,
  type DateRange,
} from '../trackingChartData';

// Jest runs in America/Los_Angeles; 9 am local on Sep 22.
const september22 = new Date(2026, 8, 22, 9);

describe('chart ranges', () => {
  it('end today and cover 7 days, 30 days, or 12 calendar months', () => {
    expect(resolveChartRange('week', september22)).toEqual({
      start: '2026-09-16',
      end: '2026-09-22',
    });
    expect(resolveChartRange('month', september22)).toEqual({
      start: '2026-08-24',
      end: '2026-09-22',
    });
    expect(resolveChartRange('year', september22)).toEqual({
      start: '2025-10-01',
      end: '2026-09-22',
    });
    expect(daysIn(resolveChartRange('week', september22))).toHaveLength(7);
    expect(daysIn(resolveChartRange('month', september22))).toHaveLength(30);
  });

  it('use the local date late in the evening, not the UTC one', () => {
    // 11:30 pm on Jan 3 in Los Angeles is already Jan 4 in UTC.
    const lateJanuary3 = new Date(2026, 0, 3, 23, 30);
    expect(resolveChartRange('week', lateJanuary3)).toEqual({
      start: '2025-12-28',
      end: '2026-01-03',
    });
    expect(resolveChartRange('year', lateJanuary3)).toEqual({
      start: '2025-02-01',
      end: '2026-01-03',
    });
  });
});

describe('chunking', () => {
  it('splits a year into consecutive pieces of at most 90 days', () => {
    const year = resolveChartRange('year', september22);
    const chunks = chunkDateRange(year);
    expect(chunks).toEqual([
      { start: '2025-10-01', end: '2025-12-29' },
      { start: '2025-12-30', end: '2026-03-29' },
      { start: '2026-03-30', end: '2026-06-27' },
      { start: '2026-06-28', end: '2026-09-22' },
    ]);
    expect(chunks.flatMap(daysIn)).toEqual(daysIn(year));
    expect(chunks.every((chunk) => daysIn(chunk).length <= 90)).toBe(true);
    expect(
      chunkDateRange({ start: '2025-09-23', end: '2026-09-22' })
    ).toHaveLength(5);
  });

  it('keeps a week, a month, or a single day in one request', () => {
    expect(chunkDateRange(resolveChartRange('week', september22))).toHaveLength(
      1
    );
    expect(
      chunkDateRange(resolveChartRange('month', september22))
    ).toHaveLength(1);
    expect(chunkDateRange({ start: '2026-09-22', end: '2026-09-22' })).toEqual([
      { start: '2026-09-22', end: '2026-09-22' },
    ]);
    expect(() => chunkDateRange({ start: 'a', end: 'b' }, 0)).toThrow(
      RangeError
    );
  });

  it('merges answers into one item per date, oldest first', () => {
    expect(
      mergeDailyItems([
        [
          { date: '2026-09-02', v: 1 },
          { date: '2026-09-01', v: 1 },
        ],
        [
          { date: '2026-09-02', v: 2 },
          { date: '2026-09-03', v: 2 },
        ],
      ])
    ).toEqual([
      { date: '2026-09-01', v: 1 },
      { date: '2026-09-02', v: 2 },
      { date: '2026-09-03', v: 2 },
    ]);
  });

  it('fetches the chunks one after another, in order', async () => {
    const calls: DateRange[] = [];
    let inFlight = 0;
    const fetchChunk = jest.fn(async (chunk: DateRange) => {
      inFlight += 1;
      expect(inFlight).toBe(1);
      calls.push(chunk);
      await Promise.resolve();
      inFlight -= 1;
      return [{ date: chunk.end }, { date: chunk.start }];
    });
    const items = await fetchInChunks(
      resolveChartRange('year', september22),
      fetchChunk
    );
    expect(calls.map((chunk) => chunk.start)).toEqual([
      '2025-10-01',
      '2025-12-30',
      '2026-03-30',
      '2026-06-28',
    ]);
    expect(items[0]?.date).toBe('2025-10-01');
    expect(items[items.length - 1]?.date).toBe('2026-09-22');
    expect(items).toHaveLength(8);
  });
});

describe('water bars', () => {
  it('leave days with no water as empty slots', () => {
    const bars = dailyBars([{ date: '2026-09-18', total: { value: 24 } }], {
      start: '2026-09-16',
      end: '2026-09-18',
    });
    expect(
      bars.map(({ start, value, logged }) => [start, value, logged])
    ).toEqual([
      ['2026-09-16', 0, false],
      ['2026-09-17', 0, false],
      ['2026-09-18', 24, true],
    ]);
  });

  it('sum daily totals per calendar month for the year', () => {
    const range = resolveChartRange('year', september22);
    const items = [
      { date: '2025-10-01', total: { value: 10 } },
      { date: '2025-10-31', total: { value: 5.5 } },
      { date: '2026-02-28', total: { value: 0.1 } },
      { date: '2026-02-01', total: { value: 0.2 } },
      { date: '2026-09-22', total: { value: 24 } },
      { date: '2025-09-30', total: { value: 99 } },
    ];
    const bars = monthlyBars(items, range);
    expect(bars).toHaveLength(12);
    expect(bars[0]?.key).toBe('2025-10');
    expect(bars[11]?.key).toBe('2026-09');
    expect(
      bars.filter((bar) => bar.logged).map(({ key, value }) => [key, value])
    ).toEqual([
      ['2025-10', 15.5],
      ['2026-02', 0.3],
      ['2026-09', 24],
    ]);
    expect(bars.find((bar) => bar.key === '2026-01')?.value).toBe(0);
    expect(waterBars(items, 'year', range)).toEqual(bars);
    expect(
      waterBars(items, 'month', resolveChartRange('month', september22))
    ).toHaveLength(30);
  });

  it('are summarised for screen readers', () => {
    const bars = dailyBars(
      [
        { date: '2026-09-18', total: { value: 24 } },
        { date: '2026-09-19', total: { value: 32 } },
      ],
      resolveChartRange('week', september22)
    );
    expect(waterSummary(bars, 'week', 'fl oz')).toBe(
      'Water, last 7 days: 2 of 7 days logged, 56 fl oz in total, most 32 fl oz on Sat, Sep 19'
    );
    expect(
      waterSummary(
        dailyBars([], { start: '2026-09-22', end: '2026-09-22' }),
        'week',
        'ml'
      )
    ).toBe('Water, last 7 days: nothing logged');
  });
});

describe('weight points', () => {
  it('convert between kg and lb for display', () => {
    expect(convertWeight(1, 'lb', 'kg')).toBe(0.45359237);
    expect(convertWeight(0.45359237, 'kg', 'lb')).toBeCloseTo(1, 10);
    expect(convertWeight(150, 'lb', 'lb')).toBe(150);
    expect(convertWeight(10, 'st', 'kg')).toBe(10);
  });

  it('put every day in the selected unit, oldest first, inside the range', () => {
    const points = weightPoints(
      [
        { date: '2026-09-21', weight: { value: 70, unit: 'kg' } },
        { date: '2026-09-18', weight: { value: 150, unit: 'lb' } },
        { date: '2026-09-01', weight: { value: 160, unit: 'lb' } },
      ],
      { start: '2026-09-16', end: '2026-09-22' },
      'lb'
    );
    expect(points.map((point) => point.date)).toEqual([
      '2026-09-18',
      '2026-09-21',
    ]);
    expect(points[0]?.value).toBe(150);
    expect(points[1]?.value).toBeCloseTo(154.32, 2);
    expect(weightSummary(points, 'week', 'lb')).toBe(
      'Weight, last 7 days: 2 entries, from 150 lb to 154.3 lb, lowest 150 lb, highest 154.3 lb'
    );
    expect(weightSummary([], 'year', 'kg')).toBe(
      'Weight, last 12 months: no entries'
    );
  });
});

describe('axes', () => {
  it('format values with grouping and at most one decimal', () => {
    expect(formatChartValue(18936)).toBe('18,936');
    expect(formatChartValue(154.3236)).toBe('154.3');
    expect(formatChartValue(0.125, 3)).toBe('0.125');
  });

  it('round the maximum up to a readable value', () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(72)).toBe(100);
    expect(niceCeiling(48)).toBe(50);
    expect(niceCeiling(2.1)).toBe(2.5);
  });

  it('label sparse dates that always include today', () => {
    expect(axisLabelIndexes(7, 'week')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(axisLabelIndexes(30, 'month')).toEqual([1, 8, 15, 22, 29]);
    expect(axisLabelIndexes(12, 'year')).toEqual([2, 5, 8, 11]);
    expect(axisLabelIndexes(0, 'week')).toEqual([]);
  });
});
