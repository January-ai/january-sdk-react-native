import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../NativeJanuaryReactNative', () => ({
  __esModule: true,
  default: {
    configureClient: jest.fn(() => null),
    disposeClient: jest.fn(),
    foodAnalysisAnalyzePhoto: jest.fn(async () =>
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
    foodLogsUpdate: jest.fn(async () =>
      JSON.stringify({ foods: [], id: 'log-1', timestamp_utc: 'now' })
    ),
    foodsSearch: jest.fn(async () => '{"totalCount":0,"items":[]}'),
    getNativeModuleVersion: jest.fn(() => '0.1.0'),
    glucosePredict: jest.fn(async () =>
      JSON.stringify({ chart: {}, prediction: [] })
    ),
    onTokenRequested: jest.fn(() => ({ remove: jest.fn() })),
    rejectTokenRequest: jest.fn(),
    resolveTokenRequest: jest.fn(),
  },
}));

import NativeJanuaryReactNative from '../NativeJanuaryReactNative';
import { JanuaryClient } from '../index';

const mockNativeModule = jest.mocked(NativeJanuaryReactNative!);

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
    expect(mockNativeModule.foodLogsCreate).toHaveBeenCalled();
    expect(mockNativeModule.foodLogsUpdate).toHaveBeenCalled();
    expect(mockNativeModule.foodLogsDelete).toHaveBeenCalled();
    expect(mockNativeModule.glucosePredict).toHaveBeenCalled();
  });
});
