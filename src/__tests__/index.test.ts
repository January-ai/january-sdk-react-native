import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../NativeJanuaryReactNative', () => ({
  __esModule: true,
  default: {
    configureClient: jest.fn(() => null),
    disposeClient: jest.fn(),
    foodAnalysisAnalyzePhoto: jest.fn(async () =>
      JSON.stringify({ detections: [], totalNutrients: {} })
    ),
    foodAnalysisAnalyzeDescription: jest.fn(async () =>
      JSON.stringify({ detections: [], totalNutrients: {} })
    ),
    foodAnalysisCorrect: jest.fn(async () =>
      JSON.stringify({ detections: [], totalNutrients: {} })
    ),
    foodLogsCreate: jest.fn(async () =>
      JSON.stringify({ foods: [], id: 'log-1', timestamp_utc: 'now' })
    ),
    foodLogsDelete: jest.fn(async () => '{}'),
    foodLogsList: jest.fn(async () =>
      JSON.stringify({ items: [], total_count: 0 })
    ),
    foodLogsGetSummary: jest.fn(async () =>
      JSON.stringify({
        group_by: 'day',
        week_start: null,
        timezone: 'UTC',
        start_date: '2026-09-14',
        end_date: '2026-09-14',
        buckets: [
          {
            start_date: '2026-09-14',
            end_date: '2026-09-14',
            logs_count: 1,
            days_with_logs: 1,
            nutrients: { calories: { value: 1853.06, unit: 'kcal' } },
          },
        ],
        totals: { logs_count: 3, days_with_logs: 2, nutrients: {} },
        average_per_logged_day: { nutrients: {} },
      })
    ),
    foodLogsUpdate: jest.fn(async () =>
      JSON.stringify({ foods: [], id: 'log-1', timestamp_utc: 'now' })
    ),
    foodsSearch: jest.fn(async () => '{"totalCount":0,"items":[]}'),
    foodsAutocomplete: jest.fn(async () => '{"items":[]}'),
    foodsGet: jest.fn(async () =>
      JSON.stringify({ id: 'food-1', servings: [], type: 'generic' })
    ),
    foodsLookupBarcode: jest.fn(async () =>
      JSON.stringify({ items: [], total_count: 0 })
    ),
    foodsSuggestAlternatives: jest.fn(async () =>
      JSON.stringify({ alternatives: [] })
    ),
    getNativeModuleVersion: jest.fn(() => '0.2.1'),
    glucosePredict: jest.fn(async () =>
      JSON.stringify({ chart: {}, prediction: [] })
    ),
    onTokenRequested: jest.fn(() => ({ remove: jest.fn() })),
    rejectTokenRequest: jest.fn(),
    restaurantMenuItems: jest.fn(async () =>
      JSON.stringify({ items: [{ id: 'menu-1', name: 'Bowl', servings: [] }] })
    ),
    restaurantMenuItemsSearch: jest.fn(async () =>
      JSON.stringify({ items: [], total_count: 0 })
    ),
    restaurantsSearch: jest.fn(async () =>
      JSON.stringify({ items: [], total_count: 0 })
    ),
    resolveTokenRequest: jest.fn(),
    waterLogsCreate: jest.fn(async () =>
      JSON.stringify({
        id: 'water-1',
        amount: { value: 8, unit: 'fl_oz' },
        consumed_at: '2026-09-10T14:30:15.123Z',
      })
    ),
    waterLogsDelete: jest.fn(async () => '{}'),
    waterLogsList: jest.fn(async () =>
      JSON.stringify({
        items: [{ date: '2026-09-10', total: { value: 64, unit: 'fl_oz' } }],
      })
    ),
    weightLogsCreate: jest.fn(async () =>
      JSON.stringify({
        weight: { value: 150, unit: 'lb' },
        measured_at: '2026-09-10T14:30:15.123Z',
      })
    ),
    weightLogsList: jest.fn(async () =>
      JSON.stringify({
        items: [{ date: '2026-09-10', weight: { value: 150, unit: 'lb' } }],
      })
    ),
  },
}));

import NativeJanuaryReactNative from '../NativeJanuaryReactNative';
import { JanuaryClient } from '../index';

const mockNativeModule = jest.mocked(NativeJanuaryReactNative!);

// Each test sees only its own native calls, whatever order the tests run in.
// The mocks keep their implementations.
beforeEach(() => {
  jest.clearAllMocks();
});

describe('January React Native SDK', () => {
  it('configures and calls the native SDK', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
      timezone: 'America/New_York',
    });

    await expect(client.foods.search({ query: 'banana' })).resolves.toEqual({
      totalCount: 0,
      items: [],
    });
    expect(mockNativeModule.configureClient).toHaveBeenCalledWith(
      expect.any(String),
      'demo-user',
      'America/New_York'
    );
    expect(mockNativeModule.foodsSearch).toHaveBeenCalledWith(
      expect.any(String),
      'banana',
      null,
      10
    );
  });

  it('exposes analysis, food logs, and glucose through the native module', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });
    const selection = {
      id: 'food-1',
      serving: { id: 'serving-1', quantity: 1 },
    };

    await client.foodAnalysis.analyzePhoto({
      image: 'data:image/jpeg;base64,test',
    });
    await client.foodLogs.list({ start: '2026-09-01', end: '2026-09-02' });
    await client.foodLogs.create({ foods: [selection], name: 'Lunch' });
    await client.foodLogs.update({ id: 'log-1', name: 'Dinner' });
    await client.foodLogs.delete('log-1');
    await client.glucose.predict({
      foods: [selection],
      startTime: '2026-09-02T12:00:00Z',
      userProfile: {
        age: 36,
        height: { unit: 'in', value: 66 },
        sex: 'female',
        weight: { unit: 'lb', value: 150 },
      },
    });

    expect(mockNativeModule.foodAnalysisAnalyzePhoto).toHaveBeenCalled();
    expect(mockNativeModule.foodLogsList).toHaveBeenCalled();

    const summary = await client.foodLogs.getSummary({
      start: '2026-09-14',
      end: '2026-09-14',
    });
    expect(mockNativeModule.foodLogsGetSummary).toHaveBeenCalledWith(
      expect.any(String),
      '2026-09-14',
      '2026-09-14',
      'day',
      'monday'
    );
    expect(summary.buckets[0]?.nutrients.calories?.value).toBe(1853.06);
    expect(summary.totals.daysWithLogs).toBe(2);

    await client.foodAnalysis.analyzePhoto({
      image: 'https://example.com/meal.jpg',
      reasoningEffort: 'xhigh',
    });
    expect(mockNativeModule.foodAnalysisAnalyzePhoto).toHaveBeenLastCalledWith(
      expect.any(String),
      'https://example.com/meal.jpg',
      'xhigh'
    );
    expect(mockNativeModule.foodLogsCreate).toHaveBeenCalled();
    expect(mockNativeModule.foodLogsUpdate).toHaveBeenCalled();
    expect(mockNativeModule.foodLogsDelete).toHaveBeenCalled();
    expect(mockNativeModule.glucosePredict).toHaveBeenCalled();
  });

  it('exposes restaurant and menu operations through the native SDKs', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });
    const search = {
      latitude: 37.775,
      longitude: -122.419,
      query: 'cafe',
    };

    await expect(client.restaurants.search(search)).resolves.toEqual({
      items: [],
      totalCount: 0,
    });
    await client.restaurants.searchMenuItems(search);
    await expect(
      client.restaurants.getMenuItems({ restaurantId: 'restaurant-1' })
    ).resolves.toEqual({
      items: [{ id: 'menu-1', name: 'Bowl', servings: [] }],
    });

    expect(mockNativeModule.restaurantsSearch).toHaveBeenCalledWith(
      expect.any(String),
      'cafe',
      37.775,
      -122.419,
      8_000,
      10
    );
    expect(mockNativeModule.restaurantMenuItemsSearch).toHaveBeenCalled();
    expect(mockNativeModule.restaurantMenuItems).toHaveBeenCalledWith(
      expect.any(String),
      'restaurant-1',
      100,
      0
    );
  });

  it('exposes the complete native food discovery surface', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });

    await client.foods.autocomplete({ query: 'oat' });
    await client.foods.get({ foodId: 'food-1' });
    await client.foods.lookupBarcode({ upc: '012345678905' });
    await client.foods.suggestAlternatives({
      dietPreferences: ['high_protein'],
      dietRestrictions: ['gluten'],
      foodId: 'food-1',
    });
    await client.foodAnalysis.analyzeDescription({
      query: 'oatmeal and fruit',
    });

    expect(mockNativeModule.foodsAutocomplete).toHaveBeenCalledWith(
      expect.any(String),
      'oat',
      null,
      8
    );
    expect(mockNativeModule.foodsGet).toHaveBeenCalled();
    expect(mockNativeModule.foodsLookupBarcode).toHaveBeenCalled();
    expect(mockNativeModule.foodsSuggestAlternatives).toHaveBeenCalledWith(
      expect.any(String),
      'food-1',
      '["gluten"]',
      '["high_protein"]'
    );
    expect(mockNativeModule.foodAnalysisAnalyzeDescription).toHaveBeenCalled();
  });

  it('exposes water and weight logs through the native SDKs', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });

    const water = await client.waterLogs.create({
      amount: { value: 8, unit: 'fl_oz' },
      consumedAt: '2026-09-10T07:30:15-07:00',
    });
    expect(mockNativeModule.waterLogsCreate).toHaveBeenCalledWith(
      expect.any(String),
      8,
      'fl_oz',
      '2026-09-10T07:30:15-07:00'
    );
    expect(water).toEqual({
      id: 'water-1',
      amount: { value: 8, unit: 'fl_oz' },
      consumedAt: '2026-09-10T14:30:15.123Z',
    });

    const totals = await client.waterLogs.list({
      start: '2026-09-10',
      end: '2026-09-10',
      unit: 'ml',
    });
    expect(mockNativeModule.waterLogsList).toHaveBeenCalledWith(
      expect.any(String),
      '2026-09-10',
      '2026-09-10',
      'ml'
    );
    expect(totals.items[0]?.total.value).toBe(64);
    await client.waterLogs.delete('water-1');
    expect(mockNativeModule.waterLogsDelete).toHaveBeenCalledWith(
      expect.any(String),
      'water-1'
    );

    const weight = await client.weightLogs.create({
      weight: { value: 150, unit: 'lb' },
    });
    expect(mockNativeModule.weightLogsCreate).toHaveBeenCalledWith(
      expect.any(String),
      150,
      'lb',
      null
    );
    expect(weight.measuredAt).toBe('2026-09-10T14:30:15.123Z');
    const weights = await client.weightLogs.list({
      start: '2026-09-01',
      end: '2026-09-10',
    });
    expect(mockNativeModule.weightLogsList).toHaveBeenCalledWith(
      expect.any(String),
      '2026-09-01',
      '2026-09-10'
    );
    expect(weights.items[0]?.weight).toEqual({ value: 150, unit: 'lb' });
  });

  it('logs and totals water in US cups', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });
    mockNativeModule.waterLogsCreate.mockResolvedValueOnce(
      JSON.stringify({
        id: 'water-2',
        amount: { value: 0.125, unit: 'cup' },
        consumed_at: '2026-09-10T14:30:15.123Z',
      })
    );
    mockNativeModule.waterLogsList.mockResolvedValueOnce(
      JSON.stringify({
        items: [{ date: '2026-09-10', total: { value: 8, unit: 'cup' } }],
      })
    );

    const water = await client.waterLogs.create({
      amount: { value: 0.125, unit: 'cup' },
    });
    expect(mockNativeModule.waterLogsCreate).toHaveBeenLastCalledWith(
      expect.any(String),
      0.125,
      'cup',
      null
    );
    expect(water.amount).toEqual({ value: 0.125, unit: 'cup' });

    const totals = await client.waterLogs.list({
      start: '2026-09-10',
      end: '2026-09-10',
      unit: 'cup',
    });
    expect(mockNativeModule.waterLogsList).toHaveBeenLastCalledWith(
      expect.any(String),
      '2026-09-10',
      '2026-09-10',
      'cup'
    );
    expect(totals.items[0]?.total).toEqual({ value: 8, unit: 'cup' });
  });

  it('validates water, weight, and food-log updates before crossing the bridge', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });

    await expect(
      client.waterLogs.create({ amount: { value: 0, unit: 'ml' } })
    ).rejects.toThrow('amount.value must be a positive number.');
    await expect(
      client.waterLogs.create({
        amount: { value: 8, unit: 'cups' as 'ml' },
      })
    ).rejects.toThrow('amount.unit must be fl_oz, ml, or cup.');
    await expect(
      client.waterLogs.list({
        start: '2026-09-01',
        end: '2026-09-10',
        unit: 'gallon' as 'ml',
      })
    ).rejects.toThrow('unit must be fl_oz, ml, or cup.');
    await expect(
      client.waterLogs.list({ start: '', end: '2026-09-10' })
    ).rejects.toThrow('start and end are required.');
    await expect(client.waterLogs.delete(' ')).rejects.toThrow(
      'id is required.'
    );
    await expect(
      client.weightLogs.create({ weight: { value: 150, unit: 'st' as 'kg' } })
    ).rejects.toThrow('weight.unit must be lb or kg.');
    await expect(client.foodLogs.update({ id: 'log-1' })).rejects.toThrow(
      'An update needs at least one of foods, timestampUTC, or name.'
    );
    // None of these requests reached the native module.
    expect(mockNativeModule.waterLogsCreate).not.toHaveBeenCalled();
    expect(mockNativeModule.waterLogsList).not.toHaveBeenCalled();
    expect(mockNativeModule.waterLogsDelete).not.toHaveBeenCalled();
    expect(mockNativeModule.weightLogsCreate).not.toHaveBeenCalled();
    expect(mockNativeModule.foodLogsUpdate).not.toHaveBeenCalled();
  });

  it('validates restaurant requests before crossing the native bridge', async () => {
    const client = new JanuaryClient({
      clientTokenProvider: async () => ({ token: 'ct-test', expiresIn: 1_800 }),
      endUserId: 'demo-user',
    });

    await expect(
      client.restaurants.search({ latitude: 91, longitude: 0, query: 'cafe' })
    ).rejects.toThrow('latitude or longitude is outside the valid range.');
    await expect(
      client.restaurants.getMenuItems({ restaurantId: '', offset: 0 })
    ).rejects.toThrow('restaurantId is required.');
  });
});

describe('client tokens when the end user changes', () => {
  it('asks for a token for the new end user, and ignores the disposed client', async () => {
    type Listener = (request: {
      clientId: string;
      endUserId: string;
      requestId: string;
    }) => void;
    const listeners = new Set<Listener>();
    mockNativeModule.onTokenRequested.mockImplementation(((
      listener: Listener
    ) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    }) as never);
    const emit = (request: Parameters<Listener>[0]) => {
      for (const listener of [...listeners]) listener(request);
    };
    const clientIdOf = (endUserId: string) =>
      mockNativeModule.configureClient.mock.calls.find(
        (call) => call[1] === endUserId
      )![0];

    const firstProvider = jest.fn(async (endUserId: string) => ({
      token: `ct-for-${endUserId}`,
      expiresIn: 1_800,
    }));
    const secondProvider = jest.fn(async (endUserId: string) => ({
      token: `ct-for-${endUserId}`,
      expiresIn: 1_800,
    }));
    // A demo switching users: the first user's client is disposed and a new
    // one made for the second.
    const first = new JanuaryClient({
      clientTokenProvider: firstProvider,
      endUserId: 'first-user',
    });
    const firstClientId = clientIdOf('first-user');
    first.dispose();
    const second = new JanuaryClient({
      clientTokenProvider: secondProvider,
      endUserId: 'second-user',
    });
    const secondClientId = clientIdOf('second-user');
    expect(secondClientId).not.toBe(firstClientId);
    expect(mockNativeModule.disposeClient).toHaveBeenCalledWith(firstClientId);

    emit({
      clientId: secondClientId,
      endUserId: 'second-user',
      requestId: 'request-2',
    });
    emit({
      clientId: firstClientId,
      endUserId: 'first-user',
      requestId: 'request-1',
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(secondProvider).toHaveBeenCalledTimes(1);
    expect(secondProvider).toHaveBeenCalledWith('second-user');
    expect(firstProvider).not.toHaveBeenCalled();
    expect(mockNativeModule.resolveTokenRequest).toHaveBeenCalledWith(
      'request-2',
      'ct-for-second-user',
      1_800
    );
    expect(mockNativeModule.resolveTokenRequest).not.toHaveBeenCalledWith(
      'request-1',
      expect.anything(),
      expect.anything()
    );
    second.dispose();
    mockNativeModule.onTokenRequested.mockImplementation((() => ({
      remove: jest.fn(),
    })) as never);
  });
});
