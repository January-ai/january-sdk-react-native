import type { EventSubscription } from 'react-native';

import NativeJanuaryReactNative from './NativeJanuaryReactNative';
import type {
  AnalyzeDescriptionRequest,
  AnalyzePhotoRequest,
  AutocompleteFoodsRequest,
  AutocompleteFoodsResponse,
  CorrectPhotoScanRequest,
  CreateFoodLogRequest,
  FoodLog,
  FoodLogList,
  GetRestaurantMenuItemsRequest,
  GetRestaurantMenuItemsResponse,
  FoodScan,
  FoodSearchResults,
  GetFoodRequest,
  JanuaryClientOptions,
  ListFoodLogsRequest,
  LookupFoodByBarcodeRequest,
  GlucosePrediction,
  PredictGlucoseRequest,
  SearchRestaurantMenuItemsResponse,
  SearchRestaurantsRequest,
  SearchRestaurantsResponse,
  SearchFoodsRequest,
  SuggestFoodAlternativesRequest,
  SuggestFoodAlternativesResponse,
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
    autocomplete: (
      request: AutocompleteFoodsRequest
    ) => Promise<AutocompleteFoodsResponse>;
    get: (
      request: GetFoodRequest
    ) => Promise<FoodSearchResults['items'][number]>;
    lookupBarcode: (
      request: LookupFoodByBarcodeRequest
    ) => Promise<FoodSearchResults>;
    search: (request: SearchFoodsRequest) => Promise<FoodSearchResults>;
    suggestAlternatives: (
      request: SuggestFoodAlternativesRequest
    ) => Promise<SuggestFoodAlternativesResponse>;
  };
  readonly foodAnalysis: {
    analyzeDescription: (
      request: AnalyzeDescriptionRequest
    ) => Promise<FoodScan>;
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
  readonly restaurants: {
    search: (
      request: SearchRestaurantsRequest
    ) => Promise<SearchRestaurantsResponse>;
    searchMenuItems: (
      request: SearchRestaurantsRequest
    ) => Promise<SearchRestaurantMenuItemsResponse>;
    getMenuItems: (
      request: GetRestaurantMenuItemsRequest
    ) => Promise<GetRestaurantMenuItemsResponse>;
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
      autocomplete: async (request) => {
        this.assertActive();
        const query = request.query.trim();
        if (!query) throw new Error('query is required.');
        const limit = request.limit ?? 8;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new Error('limit must be an integer between 1 and 100.');
        }
        return parseNativeJson<AutocompleteFoodsResponse>(
          await native.foodsAutocomplete(
            this.clientId,
            query,
            request.category ?? null,
            limit
          )
        );
      },
      get: async (request) => {
        this.assertActive();
        const foodId = request.foodId.trim();
        if (!foodId) throw new Error('foodId is required.');
        return parseNativeJson<FoodSearchResults['items'][number]>(
          await native.foodsGet(this.clientId, foodId)
        );
      },
      lookupBarcode: async (request) => {
        this.assertActive();
        const upc = request.upc.trim();
        if (!upc) throw new Error('upc is required.');
        return parseNativeJson<FoodSearchResults>(
          await native.foodsLookupBarcode(this.clientId, upc)
        );
      },
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
      suggestAlternatives: async (request) => {
        this.assertActive();
        const foodId = request.foodId.trim();
        if (!foodId) throw new Error('foodId is required.');
        return parseNativeJson<SuggestFoodAlternativesResponse>(
          await native.foodsSuggestAlternatives(
            this.clientId,
            foodId,
            JSON.stringify(request.dietRestrictions ?? []),
            JSON.stringify(request.dietPreferences ?? [])
          )
        );
      },
    };

    this.foodAnalysis = {
      analyzeDescription: async (request) => {
        this.assertActive();
        const query = request.query.trim();
        if (!query) throw new Error('query is required.');
        return parseNativeJson<FoodScan>(
          await native.foodAnalysisAnalyzeDescription(this.clientId, query)
        );
      },
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

    this.restaurants = {
      search: async (request) => {
        this.assertActive();
        const values = validateRestaurantSearch(request);
        return parseNativeJson<SearchRestaurantsResponse>(
          await native.restaurantsSearch(this.clientId, ...values)
        );
      },
      searchMenuItems: async (request) => {
        this.assertActive();
        const values = validateRestaurantSearch(request);
        return parseNativeJson<SearchRestaurantMenuItemsResponse>(
          await native.restaurantMenuItemsSearch(this.clientId, ...values)
        );
      },
      getMenuItems: async (request) => {
        this.assertActive();
        const restaurantId = request.restaurantId.trim();
        if (!restaurantId) throw new Error('restaurantId is required.');
        const limit = request.limit ?? 100;
        const offset = request.offset ?? 0;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new Error('limit must be an integer between 1 and 100.');
        }
        if (!Number.isInteger(offset) || offset < 0) {
          throw new Error('offset must be a non-negative integer.');
        }
        return parseNativeJson<GetRestaurantMenuItemsResponse>(
          await native.restaurantMenuItems(
            this.clientId,
            restaurantId,
            limit,
            offset
          )
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

function validateRestaurantSearch(
  request: SearchRestaurantsRequest
): [string, number, number, number, number] {
  const query = request.query.trim();
  if (!query) throw new Error('query is required.');
  if (
    !Number.isFinite(request.latitude) ||
    request.latitude < -90 ||
    request.latitude > 90 ||
    !Number.isFinite(request.longitude) ||
    request.longitude < -180 ||
    request.longitude > 180
  ) {
    throw new Error('latitude or longitude is outside the valid range.');
  }
  const radius = request.radius ?? 8_000;
  if (!Number.isFinite(radius) || radius < 1 || radius > 50_000) {
    throw new Error('radius must be between 1 and 50000 meters.');
  }
  const limit = request.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('limit must be an integer between 1 and 100.');
  }
  return [query, request.latitude, request.longitude, radius, limit];
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
