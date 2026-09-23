import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  analyzeFixtureDescription,
  createFixtureWaterLog,
  createFixtureWeightLog,
  deleteFixtureWaterLog,
  failFixtureRequestsOnce,
  failIfArmed,
  fixtureFoodLogsForUser,
  getFixtureFood,
  isSlow,
  listFixtureWaterLogs,
  listFixtureWeightLogs,
  resetFixtureAttempts,
  SEEDED_FIXTURE_USER,
  setFixtureEndUser,
  SLOW_FIXTURE_DELAY,
} from '../e2eFixtures';
import { localIsoDate, shiftIsoDate } from '../localDate';

// The fixtures the Maestro flows use to reach loading, empty, and error
// states on demand. Only the fixture delays are faked: React Native's Jest
// setup settles promises through setImmediate, which must keep running.
const fakeTimers = () =>
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });

/** Tracks how a promise settles, to read after advancing the clock. */
function settle(promise: Promise<unknown>): { state: string } {
  const result = { state: 'pending' };
  promise.then(
    () => {
      result.state = 'resolved';
    },
    (error: Error) => {
      result.state = `rejected: ${error.message}`;
    }
  );
  return result;
}
describe('fixture failures', () => {
  beforeEach(() => {
    fakeTimers();
    resetFixtureAttempts();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails an armed request once after a delay, then answers its retry slowly', async () => {
    failFixtureRequestsOnce('water:2026-09-21');

    const first = settle(failIfArmed('water:2026-09-21'));
    await jest.advanceTimersByTimeAsync(SLOW_FIXTURE_DELAY - 100);
    expect(first.state).toBe('pending');
    await jest.advanceTimersByTimeAsync(100);
    expect(first.state).toBe('rejected: Temporary fixture failure. Try again.');

    const retry = settle(failIfArmed('water:2026-09-21'));
    await jest.advanceTimersByTimeAsync(SLOW_FIXTURE_DELAY - 100);
    expect(retry.state).toBe('pending');
    await jest.advanceTimersByTimeAsync(100);
    expect(retry.state).toBe('resolved');

    // After the slow retry the request is ordinary again.
    const next = settle(failIfArmed('water:2026-09-21'));
    await jest.advanceTimersByTimeAsync(0);
    expect(next.state).toBe('resolved');
  });

  it('leaves requests that were not armed alone', async () => {
    failFixtureRequestsOnce('weight:2026-09-21');
    await expect(failIfArmed('weight:2026-09-20')).resolves.toBeUndefined();
    await expect(failIfArmed(undefined)).resolves.toBeUndefined();
  });

  it('forgets armed failures when the app session resets', async () => {
    failFixtureRequestsOnce('meals:2026-09-21');
    resetFixtureAttempts();
    await expect(failIfArmed('meals:2026-09-21')).resolves.toBeUndefined();
  });
});

describe('fixture answers', () => {
  it('answers slowly only when asked to, for flows that check loading', () => {
    expect(isSlow('slow search')).toBe(true);
    expect(isSlow('https://example.com/Slow-empty-plate.jpg')).toBe(true);
    expect(isSlow('greek yogurt')).toBe(false);
  });

  it('recognizes no food in a description about nothing', async () => {
    fakeTimers();
    const scan = analyzeFixtureDescription('nothing at all');
    await jest.advanceTimersByTimeAsync(2000);
    await expect(scan).resolves.toEqual({ totalNutrients: {}, detections: [] });
    jest.useRealTimers();
  });

  it('adds a serving to a food, as its own request does', async () => {
    fakeTimers();
    const food = getFixtureFood({
      id: 'oats',
      servings: [{ id: 'cup', quantity: 1, scalingFactor: 1, unit: 'cup' }],
      type: 'generic',
    });
    await jest.advanceTimersByTimeAsync(1000);
    const detail = await food;
    expect(detail.servings.map((serving) => serving.unit)).toEqual([
      'cup',
      'large bowl',
    ]);
    jest.useRealTimers();
  });
});

// Water and weight in fixture mode answer like the API: its per-log ranges,
// its 24 L daily cap on the day's total, and one end user's data each.
describe('fixture water and weight', () => {
  const today = () => localIsoDate();
  const at = (day: string) => new Date(`${day}T12:00:00`).toISOString();

  /** The promise's outcome once the fixture delays have passed. */
  async function settled<T>(promise: Promise<T>): Promise<T> {
    const outcome = promise.then(
      (value) => ({ value }),
      (error: unknown) => ({ error })
    );
    await jest.advanceTimersByTimeAsync(SLOW_FIXTURE_DELAY);
    const result = await outcome;
    if ('error' in result) throw result.error;
    return result.value;
  }

  beforeEach(() => {
    fakeTimers();
    resetFixtureAttempts();
    setFixtureEndUser(SEEDED_FIXTURE_USER);
  });
  afterEach(() => {
    jest.useRealTimers();
    setFixtureEndUser(SEEDED_FIXTURE_USER);
  });

  it('refuses a log that takes the day past 24 L, counting the day so far', async () => {
    await settled(
      createFixtureWaterLog({ unit: 'fl_oz', value: 800 }, at(today()))
    );
    await expect(
      settled(createFixtureWaterLog({ unit: 'fl_oz', value: 20 }, at(today())))
    ).rejects.toMatchObject({ code: 'daily_water_limit_exceeded' });
    await expect(
      settled(createFixtureWaterLog({ unit: 'ml', value: 300 }, at(today())))
    ).resolves.toMatchObject({ amount: { unit: 'ml', value: 300 } });
  });

  it('counts the seeded history of a past day toward its cap', async () => {
    // Two days ago has 48–80 fl oz of seeded water.
    const seededDay = shiftIsoDate(today(), -2);
    await expect(
      settled(
        createFixtureWaterLog({ unit: 'fl_oz', value: 800 }, at(seededDay))
      )
    ).rejects.toMatchObject({ code: 'daily_water_limit_exceeded' });
  });

  it('refuses amounts and weights outside the API ranges', async () => {
    await expect(
      settled(createFixtureWaterLog({ unit: 'ml', value: 10 }, at(today())))
    ).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(
      settled(createFixtureWaterLog({ unit: 'cup', value: 0.1 }, at(today())))
    ).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(
      settled(createFixtureWeightLog({ unit: 'lb', value: 5 }, at(today())))
    ).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(
      settled(createFixtureWeightLog({ unit: 'kg', value: 500 }, at(today())))
    ).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(
      settled(createFixtureWeightLog({ unit: 'kg', value: 4.5 }, at(today())))
    ).resolves.toMatchObject({ weight: { unit: 'kg', value: 4.5 } });
  });

  it('keeps each end user’s data apart', async () => {
    const created = await settled(
      createFixtureWaterLog({ unit: 'fl_oz', value: 8 }, at(today()))
    );
    await settled(
      createFixtureWeightLog({ unit: 'lb', value: 150 }, at(today()))
    );

    setFixtureEndUser('someone-else');
    expect(fixtureFoodLogsForUser()).toEqual([]);
    const week = { start: shiftIsoDate(today(), -6), end: today() };
    await expect(
      settled(listFixtureWaterLogs(week.start, week.end, 'fl_oz'))
    ).resolves.toEqual([]);
    await expect(
      settled(listFixtureWeightLogs(week.start, week.end))
    ).resolves.toEqual([]);
    // Deleting the other user's log by its ID changes nothing for them.
    await settled(deleteFixtureWaterLog(created.id));

    setFixtureEndUser(SEEDED_FIXTURE_USER);
    expect(fixtureFoodLogsForUser()).toHaveLength(1);
    const water = await settled(
      listFixtureWaterLogs(today(), today(), 'fl_oz')
    );
    expect(water).toEqual([
      { date: today(), total: { unit: 'fl_oz', value: 8 } },
    ]);
  });
});
