import type {
  AutocompleteFoodsResponse,
  DailyWaterTotal,
  DailyWeight,
  FoodLog,
  FoodLogSummary,
  FoodScan,
  FoodCategoryValue,
  FoodSearchItem,
  FoodSearchResults,
  GlucosePrediction,
  SuggestFoodAlternativesResponse,
  VolumeUnit,
  WaterAmount,
  WaterLog,
  Weight,
  WeightLog,
} from '@januaryai/react-native';

import { localDayOf, localIsoDate, shiftIsoDate } from './localDate';

/**
 * How long a fixture request stays loading when a flow asserts its loading
 * state. On iOS, Maestro waits for a tapped screen to settle before it reads
 * it, and a spinner keeps it busy for about three seconds, so a two-second
 * load is over before a flow can see it. A search, photo, or correction with
 * "slow" in it waits this long, as do armed failures and their retries.
 */
export const SLOW_FIXTURE_DELAY = 6000;

/** Whether a fixture input asks for the slow answer. */
export function isSlow(input: string): boolean {
  return input.toLowerCase().includes('slow');
}

export async function autocompleteFixtureFoods(
  query: string
): Promise<AutocompleteFoodsResponse> {
  await fixtureDelay(300);
  if (query.trim().length < 2) return { items: [] };
  return {
    items: [
      {
        id: 'fixture-oatmeal',
        name: 'Fixture oatmeal',
        brandName: 'January fixture',
      },
      { id: 'fixture-oat-milk', name: 'Oat milk' },
    ],
  };
}

export async function searchFixtureFoods(
  query: string,
  category?: FoodCategoryValue
): Promise<FoodSearchResults> {
  await fixtureDelay(isSlow(query) ? SLOW_FIXTURE_DELAY : undefined);

  switch (query.toLowerCase()) {
    case 'force error':
      throw new Error('Fixture request failed.');
    case 'error 401':
      throw fixtureError(
        'The test request could not be completed.',
        'authentication',
        401
      );
    case 'error 403':
      throw fixtureError(
        'The test request could not be completed.',
        'authorization',
        403
      );
    case 'error 404':
      throw fixtureError(
        'The test request could not be completed.',
        'not_found',
        404
      );
    case 'error 422':
      throw fixtureError(
        'The test request could not be completed.',
        'validation',
        422
      );
    case 'error 429':
      throw fixtureError(
        'The test request could not be completed.',
        'rate_limited',
        429
      );
    case 'error 504':
      throw fixtureError(
        'The test request could not be completed.',
        'timeout',
        504
      );
    case 'retry search':
      if (takeFirstAttempt('retry-search')) {
        throw new Error('Temporary fixture search failure.');
      }
      return defaultFixtureFoods();
    case 'retry picker':
      if (takeFirstAttempt('retry-picker')) {
        throw new Error('Temporary fixture picker failure.');
      }
      return defaultFixtureFoods();
    case 'no results':
      return { items: [], totalCount: 0 };
    case 'slow search':
      return defaultFixtureFoods();
    case 'missing serving': {
      const item = fixtureFood('Missing serving fixture', 'generic');
      return { items: [{ ...item, servings: [] }], totalCount: 1 };
    }
    case 'category': {
      const label = category ?? 'all';
      const item = fixtureFood(`${capitalize(label)} category fixture`, label);
      return { items: [item], totalCount: 1 };
    }
    case 'oatmeal': {
      const item = fixtureFood('Fixture oatmeal', 'generic', 160, '1 cup');
      return {
        items: [
          {
            ...item,
            brandName: 'January fixture',
            calories: 100,
            carbohydrates: 20,
            fiber: 3,
            protein: 4,
            sodium: 10,
            totalFat: 2,
            servings: item.servings.map((serving) => ({
              ...serving,
              weightGrams: 100,
            })),
          },
        ],
        totalCount: 1,
      };
    }
    case 'glucose recovery': {
      const item = fixtureFood('Fixture oatmeal', 'generic', 100, '1 cup');
      return {
        items: [{ ...item, barcode: 'fixture-glucose-retry' }],
        totalCount: 1,
      };
    }
    case 'alternatives error': {
      const item = fixtureFood('Fixture oatmeal', 'generic', 100, '1 cup');
      return {
        items: [{ ...item, barcode: 'fixture-alternatives-retry' }],
        totalCount: 1,
      };
    }
    case 'detail error': {
      const item = fixtureFood('Fixture oatmeal', 'generic', 100, '1 cup');
      return {
        items: [{ ...item, barcode: 'fixture-detail-error' }],
        totalCount: 1,
      };
    }
    case 'alternatives empty': {
      const item = fixtureFood('Fixture oatmeal', 'generic', 100, '1 cup');
      return {
        items: [{ ...item, barcode: 'fixture-alternatives-empty' }],
        totalCount: 1,
      };
    }
    default:
      return defaultFixtureFoods();
  }
}

function fixtureError(message: string, code: string, status: number): Error {
  return Object.assign(new Error(message), {
    code,
    requestId: 'fixture-request',
    status,
  });
}

function defaultFixtureFoods(): FoodSearchResults {
  const items = [
    fixtureFood('Greek yogurt', 'generic', 100, '6 oz'),
    fixtureFood(
      'Greek Yogurt, Strawberry or Vanilla',
      'branded',
      90,
      '1 container',
      'Demo dairy'
    ),
  ];
  return { items, totalCount: items.length };
}

function fixtureFood(
  name: string,
  type: FoodCategoryValue | 'all',
  calories = 120,
  serving = '1 serving',
  brandName?: string
): FoodSearchItem {
  const [quantity, ...unit] = serving.split(' ');
  return {
    id: `fixture-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    brandName,
    calories,
    servings: [
      {
        id: `fixture-serving-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        isPrimary: true,
        quantity: Number(quantity) || 1,
        scalingFactor: 1,
        unit: unit.join(' ') || 'serving',
      },
    ],
    type: type === 'all' ? 'generic' : type,
  };
}

/**
 * The food as `foods.get` returns it: the search result with every serving,
 * here one more than search listed, so the serving menu has a choice. A food
 * found with "detail error" fails, and the screen keeps the search result.
 */
export async function getFixtureFood(
  food: FoodSearchItem
): Promise<FoodSearchItem> {
  await fixtureDelay(1000);
  if (food.barcode === 'fixture-detail-error') {
    throw fixtureError('Temporary fixture food failure.', 'server', 503);
  }
  const primary = food.servings[0];
  if (!primary) return food;
  return {
    ...food,
    servings: [
      ...food.servings,
      {
        id: `${primary.id ?? 'fixture'}-bowl`,
        quantity: 1,
        scalingFactor: 1.5,
        unit: 'large bowl',
        weightGrams: 240,
      },
    ],
  };
}

export const fixtureScan: FoodScan = {
  mealName: 'Fixture breakfast',
  totalNutrients: {
    calories: { value: 100, unit: 'kcal' },
    protein: { value: 4, unit: 'g' },
    carbohydrates: { value: 20, unit: 'g' },
    totalFat: { value: 2, unit: 'g' },
    fiber: { value: 3, unit: 'g' },
    sodium: { value: 10, unit: 'mg' },
  },
  detections: [
    {
      confidenceScore: 'high',
      food: {
        id: 'fixture-oatmeal',
        name: 'Fixture oatmeal',
        brandName: 'January fixture',
        nutrients: {
          calories: { value: 100, unit: 'kcal' },
          protein: { value: 4, unit: 'g' },
          carbohydrates: { value: 20, unit: 'g' },
          totalFat: { value: 2, unit: 'g' },
          fiber: { value: 3, unit: 'g' },
          sodium: { value: 10, unit: 'mg' },
        },
        quantity: 1,
        serving: {
          id: 'fixture-oatmeal-serving',
          quantity: 1,
          unit: 'cup',
        },
      },
    },
  ],
};

/** A scan that recognized nothing, as the API answers for a non-food. */
export const fixtureEmptyScan: FoodScan = {
  totalNutrients: {},
  detections: [],
};

export async function analyzeFixtureDescription(
  query: string
): Promise<FoodScan> {
  await fixtureDelay();
  if (query.toLowerCase().includes('error')) {
    throw new Error('Fixture request failed.');
  }
  if (query.toLowerCase().includes('nothing')) return fixtureEmptyScan;
  return fixtureScan;
}

export async function lookupFixtureBarcode(
  upc: string
): Promise<FoodSearchResults> {
  await fixtureDelay();
  if (upc.toLowerCase().includes('error')) {
    throw new Error('Fixture request failed.');
  }
  if (/^0+$/.test(upc)) return { items: [], totalCount: 0 };
  return searchFixtureFoods('oatmeal');
}

/**
 * Fixture data belongs to one end user, like the API's. The seeded meal and
 * the seeded year of water and weight are the configured fixture user's; any
 * other end user starts with nothing, and each user's logs from this session
 * are theirs alone. The demo tells the fixtures who the user is whenever it
 * changes (setFixtureEndUser), before the screens load for them.
 */
export const SEEDED_FIXTURE_USER = 'parity-user';
let fixtureUser = SEEDED_FIXTURE_USER;

export function setFixtureEndUser(endUserId: string): void {
  fixtureUser = endUserId;
}

function isSeededUser(): boolean {
  return fixtureUser === SEEDED_FIXTURE_USER;
}

/** Today's fixture meal, for the seeded user only. */
export function fixtureFoodLogsForUser(): FoodLog[] {
  return isSeededUser() ? fixtureFoodLogs : [];
}

export const fixtureFoodLogs: FoodLog[] = [
  {
    id: 'fixture-log-breakfast',
    name: 'Fixture breakfast',
    // Today at local noon, so the log sits inside the default week range.
    timestampUTC: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    foods: [
      {
        id: 'fixture-oatmeal',
        name: 'Fixture oatmeal',
        brandName: 'January fixture',
        nutrients: fixtureScan.detections[0]!.food.nutrients,
        consumedServing: { id: 'fixture-oatmeal-serving', quantity: 1 },
        servingDetails: {
          id: 'fixture-oatmeal-serving',
          quantity: 1,
          unit: 'cup',
        },
      },
    ],
  },
];

export const fixtureFoodLogSummary: FoodLogSummary = {
  groupBy: 'day',
  timezone: 'UTC',
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  // One bucket per day of the range, as the API returns them; only the first
  // day has a log.
  buckets: [
    {
      startDate: '2026-08-31',
      endDate: '2026-08-31',
      logsCount: 1,
      daysWithLogs: 1,
      nutrients: fixtureScan.detections[0]!.food.nutrients,
    },
    ...['01', '02', '03', '04', '05', '06'].map((day) => ({
      startDate: `2026-09-${day}`,
      endDate: `2026-09-${day}`,
      logsCount: 0,
      daysWithLogs: 0,
      nutrients: {},
    })),
  ],
  totals: {
    logsCount: 1,
    daysWithLogs: 1,
    nutrients: fixtureScan.detections[0]!.food.nutrients,
  },
  averagePerLoggedDay: {
    nutrients: fixtureScan.detections[0]!.food.nutrients,
  },
};

export const fixtureGlucosePrediction: GlucosePrediction = {
  impact: 'medium',
  chart: { min: 70, max: 140 },
  prediction: [
    { minutes: 0, value: 90 },
    { minutes: 30, value: 125 },
    { minutes: 60, value: 140 },
    { minutes: 90, value: 115 },
    { minutes: 120, value: 95 },
    { minutes: 180, value: 94 },
  ],
};

const attempts = new Set<string>();

export function resetFixtureAttempts(): void {
  attempts.clear();
  pendingFailures.clear();
  slowRetries.clear();
  sessionLogs.clear();
}

// Requests armed to fail once, so a flow can reach an error state on demand:
// a long press on a control arms the requests it is about to make (see
// failFixtureRequestsOnce). An armed request fails after a loading delay, and
// its retry answers after the same delay, so a flow sees the loading state on
// the way into the error and on the way out of it.
const pendingFailures = new Set<string>();
const slowRetries = new Set<string>();
const FAILURE_DELAY = SLOW_FIXTURE_DELAY;

/** Arms the named fixture requests to fail the next time they are made. */
export function failFixtureRequestsOnce(...keys: string[]): void {
  for (const key of keys) pendingFailures.add(key);
}

/**
 * Throws, after a loading delay, when `key` was armed; the next request with
 * that key waits the same delay and succeeds.
 */
export async function failIfArmed(key: string | undefined): Promise<void> {
  if (!key) return;
  if (slowRetries.delete(key)) {
    await fixtureDelay(FAILURE_DELAY);
    return;
  }
  if (!pendingFailures.delete(key)) return;
  slowRetries.add(key);
  await fixtureDelay(FAILURE_DELAY);
  throw fixtureError('Temporary fixture failure. Try again.', 'server', 503);
}

// Water and weight logs are the one stateful fixture: a flow logs, reads the
// day's total back, and deletes, so the entries live for the app session and
// every bootstrap clears them. Amounts are kept in fluid ounces and converted
// on the way out, like the API's daily totals.
const ML_PER_FL_OZ = 29.5735;
const FL_OZ_PER_CUP = 8;
// The API's limits: one log of 1–811.5 fl oz, 30–24000 ml, or 0.125–101.4
// cup, and at most 24 L (811.5 fl oz) in a day; a weight of 10–1000 lb or
// 4.5–453.6 kg.
const DAILY_WATER_CAP_FL_OZ = 811.5;
const waterRange: Record<VolumeUnit, [number, number]> = {
  cup: [0.125, 101.4],
  fl_oz: [1, 811.5],
  ml: [30, 24_000],
};
const weightRange: Record<string, [number, number]> = {
  kg: [4.5, 453.6],
  lb: [10, 1000],
};

function toFluidOunces(amount: WaterAmount): number {
  if (amount.unit === 'ml') return amount.value / ML_PER_FL_OZ;
  if (amount.unit === 'cup') return amount.value * FL_OZ_PER_CUP;
  return amount.value;
}

function fromFluidOunces(fluidOunces: number, unit: VolumeUnit): number {
  if (unit === 'ml') return fluidOunces * ML_PER_FL_OZ;
  if (unit === 'cup') return fluidOunces / FL_OZ_PER_CUP;
  return fluidOunces;
}
const sessionLogs = new Map<
  string,
  { water: WaterLog[]; weight: WeightLog[] }
>();

/** This session's water and weight logs for the current fixture user. */
function userLogs(): { water: WaterLog[]; weight: WeightLog[] } {
  let logs = sessionLogs.get(fixtureUser);
  if (!logs) {
    logs = { water: [], weight: [] };
    sessionLogs.set(fixtureUser, logs);
  }
  return logs;
}

/** A day's water in fluid ounces: its seeded history plus this session's. */
function dayFluidOunces(day: string): number {
  const seeded = historyDays(day, day).reduce(
    (total, [, offset]) => total + seededWaterFluidOunces(offset),
    0
  );
  return userLogs().water.reduce(
    (total, log) =>
      localDayOf(log.consumedAt) === day
        ? total + toFluidOunces(log.amount)
        : total,
    seeded
  );
}

/**
 * A water log of exactly this many fluid ounces saves slowly, so a flow can
 * move to another day while it is in flight.
 */
export const SLOW_WATER_LOG_FL_OZ = 77;

export async function createFixtureWaterLog(
  amount: WaterAmount,
  consumedAt: string
): Promise<WaterLog> {
  await fixtureDelay(
    amount.unit === 'fl_oz' && amount.value === SLOW_WATER_LOG_FL_OZ
      ? SLOW_FIXTURE_DELAY
      : undefined
  );
  const [least, most] = waterRange[amount.unit];
  if (amount.value < least || amount.value > most) {
    throw fixtureError(
      `amount must be ${least}–${most} ${amount.unit}.`,
      'invalid_request',
      400
    );
  }
  const day = localDayOf(consumedAt);
  if (dayFluidOunces(day) + toFluidOunces(amount) > DAILY_WATER_CAP_FL_OZ) {
    throw fixtureError(
      'This log would take the day past the 24 L daily cap.',
      'daily_water_limit_exceeded',
      400
    );
  }
  const water = userLogs().water;
  const log: WaterLog = {
    id: `fixture-water-${Date.now()}-${water.length}`,
    amount,
    consumedAt,
  };
  water.push(log);
  return log;
}

/**
 * Daily water totals from `start` through `end` in `unit`, like the API: one
 * entry per day with water, oldest first, and at most the latest 100 days.
 * Each day is the seeded history plus whatever this session logged on it.
 * `emptyHistory` answers as for an end user who never logged anything.
 */
export async function listFixtureWaterLogs(
  start: string,
  end: string,
  unit: VolumeUnit,
  options: { emptyHistory?: boolean; failure?: string } = {}
): Promise<DailyWaterTotal[]> {
  await failIfArmed(options.failure);
  await fixtureDelay(300);
  if (options.emptyHistory) return [];
  const fluidOunces = new Map<string, number>();
  for (const [day, value] of historyDays(start, end)) {
    const seeded = seededWaterFluidOunces(value);
    if (seeded > 0) fluidOunces.set(day, seeded);
  }
  for (const log of userLogs().water) {
    const day = localDayOf(log.consumedAt);
    if (day < start || day > end) continue;
    fluidOunces.set(
      day,
      (fluidOunces.get(day) ?? 0) + toFluidOunces(log.amount)
    );
  }
  return [...fluidOunces.entries()]
    .filter(([, total]) => total > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-100)
    .map(([date, total]) => ({
      date,
      total: {
        unit,
        value: Math.round(fromFluidOunces(total, unit) * 10) / 10,
      },
    }));
}

export async function deleteFixtureWaterLog(id: string): Promise<void> {
  await fixtureDelay();
  const water = userLogs().water;
  const index = water.findIndex((log) => log.id === id);
  // Deleting an unknown log, or another user's, succeeds and changes nothing,
  // like the API.
  if (index >= 0) water.splice(index, 1);
}

export async function createFixtureWeightLog(
  weight: Weight,
  measuredAt: string
): Promise<WeightLog> {
  await fixtureDelay();
  const [least, most] = weightRange[weight.unit] ?? [0, Infinity];
  if (weight.value < least || weight.value > most) {
    throw fixtureError(
      `weight must be ${least}–${most} ${weight.unit}.`,
      'invalid_request',
      400
    );
  }
  // A weight of 999 fails once, so a flow can exercise retry after a server
  // failure without a special mode.
  if (weight.value === 999 && takeFirstAttempt('weight-log')) {
    throw fixtureError('Temporary fixture weight log failure.', 'server', 500);
  }
  const log: WeightLog = { weight, measuredAt };
  userLogs().weight.push(log);
  return log;
}

/**
 * The latest weight of each day from `start` through `end`, in the unit it was
 * logged in, like the API: oldest first, at most the latest 100 days. A weight
 * logged this session replaces that day's seeded one.
 */
export async function listFixtureWeightLogs(
  start: string,
  end: string,
  options: { emptyHistory?: boolean; failure?: string } = {}
): Promise<DailyWeight[]> {
  await failIfArmed(options.failure);
  await fixtureDelay(300);
  if (options.emptyHistory) return [];
  const byDay = new Map<string, Weight>();
  for (const [day, offset] of historyDays(start, end)) {
    const seeded = seededWeight(offset);
    if (seeded) byDay.set(day, seeded);
  }
  const logged = userLogs()
    .weight.filter((log) => {
      const day = localDayOf(log.measuredAt);
      return day >= start && day <= end;
    })
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
  for (const log of logged) byDay.set(localDayOf(log.measuredAt), log.weight);
  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-100)
    .map(([date, weight]) => ({ date, weight }));
}

// A year of seeded history so the Tracking charts have something to draw. It
// starts two days ago, so today and yesterday begin empty for the flows that
// log on them, and it has gaps, like a real user's. Water is 48–80 fl oz a
// day; weight drifts down from about 166 lb, logged in lb on odd days back and
// in kg on even ones, so the chart has to convert.
const HISTORY_DAYS = 400;

/**
 * Each date in `start`…`end` that the seeded history covers, with its
 * days-ago; none for an end user other than the seeded one.
 */
function historyDays(start: string, end: string): [string, number][] {
  const today = localIsoDate();
  const days: [string, number][] = [];
  if (!isSeededUser()) return days;
  for (let offset = 2; offset <= HISTORY_DAYS; offset += 1) {
    const day = shiftIsoDate(today, -offset);
    if (day >= start && day <= end) days.push([day, offset]);
  }
  return days;
}

function seededWaterFluidOunces(offset: number): number {
  if (offset % 6 === 4) return 0;
  return 48 + ((offset * 37) % 5) * 8;
}

function seededWeight(offset: number): Weight | undefined {
  if (offset % 3 === 1) return undefined;
  const pounds = 150 + offset * 0.04 + Math.sin(offset / 4) * 0.8;
  return offset % 2 === 0
    ? { unit: 'kg', value: Math.round(pounds * 0.45359237 * 10) / 10 }
    : { unit: 'lb', value: Math.round(pounds * 10) / 10 };
}

export async function analyzeFixturePhoto(image: string): Promise<FoodScan> {
  await fixtureDelay(isSlow(image) ? SLOW_FIXTURE_DELAY : undefined);
  if (image.includes('#retry') && takeFirstAttempt('scan-analysis')) {
    throw new Error('Temporary fixture scan failure.');
  }
  // An image URL with "empty" in it stands for a photo with no food in it.
  if (image.toLowerCase().includes('empty')) return fixtureEmptyScan;
  return fixtureScan;
}

export async function correctFixtureScan(
  instruction: string
): Promise<FoodScan> {
  await fixtureDelay(isSlow(instruction) ? SLOW_FIXTURE_DELAY : undefined);
  if (
    instruction.toLowerCase().includes('retry') &&
    takeFirstAttempt(`scan-correction-${instruction.toLowerCase()}`)
  ) {
    throw new Error('Temporary fixture correction failure.');
  }
  return { ...fixtureScan, mealName: 'Corrected breakfast' };
}

export async function predictFixtureGlucose(
  shouldFailOnce: boolean
): Promise<GlucosePrediction> {
  await fixtureDelay(6000);
  if (shouldFailOnce && takeFirstAttempt('glucose-prediction')) {
    throw new Error('The test request could not be completed.');
  }
  return fixtureGlucosePrediction;
}

export async function suggestFixtureAlternatives(
  foodId: string,
  behavior?: string
): Promise<SuggestFoodAlternativesResponse> {
  await fixtureDelay(4000);
  if (
    behavior === 'fixture-alternatives-retry' &&
    takeFirstAttempt(`alternatives-${foodId}`)
  ) {
    throw new Error('Fixture alternatives request failed.');
  }
  if (behavior === 'fixture-alternatives-empty') return { alternatives: [] };
  return {
    alternatives: [
      {
        id: 'fixture-lentils',
        name: 'Fixture lentils',
        brandName: 'January fixture',
        nutrients: {
          calories: { value: 116, unit: 'cal' },
          protein: { value: 9, unit: 'g' },
          carbohydrates: { value: 20, unit: 'g' },
          totalFat: { value: 0.4, unit: 'g' },
        },
        servings: [
          {
            id: 'fixture-lentils-serving',
            quantity: 1,
            unit: 'cup',
          },
        ],
      },
    ],
  };
}

export async function fixtureDelay(milliseconds = 2000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function takeFirstAttempt(key: string): boolean {
  if (attempts.has(key)) return false;
  attempts.add(key);
  return true;
}

/** True the first time `key` is asked for in an app session, then false. */
export function fixtureFailsFirstTime(key: string): boolean {
  return takeFirstAttempt(key);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
