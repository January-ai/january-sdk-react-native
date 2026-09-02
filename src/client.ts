import type { EventSubscription } from 'react-native';

import NativeJanuaryReactNative from './NativeJanuaryReactNative';
import type {
  AnalyzePhotoRequest,
  CorrectPhotoScanRequest,
  CreateFoodLogRequest,
  FoodLog,
  FoodLogList,
  FoodScan,
  FoodSearchResults,
  JanuaryClientOptions,
  ListFoodLogsRequest,
  GlucosePrediction,
  PredictGlucoseRequest,
  SearchFoodsRequest,
  UpdateFoodLogRequest,
} from './types';

let nextClientId = 0;

function requireNativeModule() {
  if (!NativeJanuaryReactNative) {
    throw new Error(
      '@januaryai/react-native is not linked. Rebuild the native application after installing the package.'
    );
  }
  return NativeJanuaryReactNative;
}

export class JanuaryClient {
  readonly foods: {
    search: (request: SearchFoodsRequest) => Promise<FoodSearchResults>;
  };
  readonly foodAnalysis: {
    analyzePhoto: (request: AnalyzePhotoRequest) => Promise<FoodScan>;
    correct: (request: CorrectPhotoScanRequest) => Promise<FoodScan>;
  };
  readonly foodLogs: {
    create: (request: CreateFoodLogRequest) => Promise<FoodLog>;
    delete: (id: string) => Promise<void>;
    list: (request: ListFoodLogsRequest) => Promise<FoodLogList>;
    update: (request: UpdateFoodLogRequest) => Promise<FoodLog>;
  };
  readonly glucose: {
    predict: (request: PredictGlucoseRequest) => Promise<GlucosePrediction>;
  };

  private readonly clientId: string;
  private readonly options: JanuaryClientOptions;
  private readonly tokenSubscription?: EventSubscription;
  private disposed = false;

  constructor(options: JanuaryClientOptions) {
    const endUserId = options.endUserId.trim();
    if (!endUserId) throw new Error('endUserId is required.');
    const developmentApiKey = options.developmentApiKey?.trim();
    if ('developmentApiKey' in options && !developmentApiKey) {
      throw new Error('developmentApiKey is required.');
    }

    this.options = { ...options, endUserId };
    this.clientId = `january-rn-${Date.now()}-${nextClientId++}`;

    const native = requireNativeModule();
    if (!developmentApiKey) {
      this.tokenSubscription = native.onTokenRequested((request) => {
        if (request.clientId !== this.clientId) return;
        this.fulfillTokenRequest(request.requestId).catch(() => undefined);
      });
    }
    const configurationError = developmentApiKey
      ? native.configureDevelopmentClient(
          this.clientId,
          developmentApiKey,
          endUserId,
          options.timezone ?? null
        )
      : native.configureClient(
          this.clientId,
          endUserId,
          options.timezone ?? null
        );
    if (configurationError) {
      this.tokenSubscription?.remove();
      throw new Error(configurationError);
    }

    this.foods = {
      search: async (request) => {
        this.assertActive();
        const query = request.query.trim();
        if (!query) throw new Error('query is required.');
        const limit = request.limit ?? 10;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new Error('limit must be an integer between 1 and 100.');
        }
        const json = await native.foodsSearch(
          this.clientId,
          query,
          request.category ?? null,
          limit
        );
        return camelizeKeys(JSON.parse(json)) as FoodSearchResults;
      },
    };

    this.foodAnalysis = {
      analyzePhoto: async (request) => {
        this.assertActive();
        const image = request.image.trim();
        if (!image) throw new Error('image is required.');
        return parseNativeJson<FoodScan>(
          await native.foodAnalysisAnalyzePhoto(this.clientId, image)
        );
      },
      correct: async (request) => {
        this.assertActive();
        const instruction = request.instruction.trim();
        if (!instruction) throw new Error('instruction is required.');
        return parseNativeJson<FoodScan>(
          await native.foodAnalysisCorrect(
            this.clientId,
            JSON.stringify(request.analysis),
            instruction
          )
        );
      },
    };

    this.foodLogs = {
      create: async (request) => {
        this.assertActive();
        assertSelections(request.foods);
        return parseNativeJson<FoodLog>(
          await native.foodLogsCreate(
            this.clientId,
            JSON.stringify(request.foods),
            request.timestampUTC ?? null,
            request.name ?? null
          )
        );
      },
      delete: async (id) => {
        this.assertActive();
        if (!id.trim()) throw new Error('id is required.');
        await native.foodLogsDelete(this.clientId, id);
      },
      list: async (request) => {
        this.assertActive();
        if (!request.start.trim() || !request.end.trim()) {
          throw new Error('start and end are required.');
        }
        return parseNativeJson<FoodLogList>(
          await native.foodLogsList(this.clientId, request.start, request.end)
        );
      },
      update: async (request) => {
        this.assertActive();
        if (!request.id.trim()) throw new Error('id is required.');
        if (request.foods) assertSelections(request.foods);
        return parseNativeJson<FoodLog>(
          await native.foodLogsUpdate(
            this.clientId,
            request.id,
            request.foods ? JSON.stringify(request.foods) : null,
            request.timestampUTC ?? null,
            request.name ?? null
          )
        );
      },
    };

    this.glucose = {
      predict: async (request) => {
        this.assertActive();
        assertSelections(request.foods);
        if (!request.startTime.trim())
          throw new Error('startTime is required.');
        return parseNativeJson<GlucosePrediction>(
          await native.glucosePredict(this.clientId, JSON.stringify(request))
        );
      },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.tokenSubscription?.remove();
    requireNativeModule().disposeClient(this.clientId);
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('This JanuaryClient has been disposed.');
  }

  private async fulfillTokenRequest(requestId: string): Promise<void> {
    const native = requireNativeModule();
    try {
      if (!this.options.clientTokenProvider) {
        throw new Error('clientTokenProvider is not configured.');
      }
      const response = await this.options.clientTokenProvider(
        this.options.endUserId
      );
      native.resolveTokenRequest(requestId, response.token, response.expiresIn);
    } catch (error) {
      const retryable =
        typeof error === 'object' &&
        error !== null &&
        'retryable' in error &&
        error.retryable === true;
      native.rejectTokenRequest(
        requestId,
        error instanceof Error ? error.message : 'Client token request failed.',
        retryable
      );
    }
  }
}

function assertSelections(
  selections: Array<{ id: string; serving: { id: string; quantity: number } }>
): void {
  if (selections.length === 0)
    throw new Error('At least one food is required.');
  for (const selection of selections) {
    if (!selection.id.trim() || !selection.serving.id.trim()) {
      throw new Error('Every food and serving must have an id.');
    }
    if (
      !Number.isFinite(selection.serving.quantity) ||
      selection.serving.quantity <= 0
    ) {
      throw new Error('Serving quantity must be greater than zero.');
    }
  }
}

function parseNativeJson<T>(json: string): T {
  return camelizeKeys(JSON.parse(json)) as T;
}

function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key
        .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
        .replace(/Url\b/g, 'URL')
        .replace(/Utc\b/g, 'UTC'),
      camelizeKeys(child),
    ])
  );
}
