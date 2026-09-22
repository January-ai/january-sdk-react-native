import { describe, expect, it } from '@jest/globals';

import {
  deviceTimeZone,
  localDayOf,
  localIsoDate,
  shiftIsoDate,
  timestampForDay,
} from '../localDate';

// Jest runs in America/Los_Angeles (scripts/jest-timezone.js): in the
// evening there, UTC has already moved to the next day.
describe('local calendar dates', () => {
  it('uses the device date, not the UTC date, for today', () => {
    const evening = new Date('2026-09-22T03:30:00Z'); // Sep 21, 8:30 pm PDT
    expect(evening.toISOString().slice(0, 10)).toBe('2026-09-22');
    expect(localIsoDate(evening)).toBe('2026-09-21');
    expect(localDayOf('2026-09-22T03:30:00Z')).toBe('2026-09-21');
  });

  it('reports the device IANA timezone', () => {
    expect(deviceTimeZone()).toBe('America/Los_Angeles');
  });

  it('shifts calendar dates across month and year ends', () => {
    expect(shiftIsoDate('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftIsoDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftIsoDate('2026-03-08', 1)).toBe('2026-03-09');
  });

  it('dates a past day at local noon so it stays on that day', () => {
    const now = new Date('2026-09-22T03:30:00Z');
    expect(timestampForDay('2026-09-21', now)).toBe(now.toISOString());
    const past = timestampForDay('2026-09-10', now);
    expect(past).toBe('2026-09-10T19:00:00.000Z');
    expect(localDayOf(past)).toBe('2026-09-10');
  });
});
