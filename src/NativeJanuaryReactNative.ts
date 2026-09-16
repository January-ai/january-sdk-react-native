import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export type TokenRequest = {
  clientId: string;
  endUserId: string;
  requestId: string;
};

export type VoiceCaptureUpdate = {
  sessionId: string;
  state: string;
  audioLevel: number;
  durationMs: number;
  partialTranscript: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export interface Spec extends TurboModule {
  getNativeModuleVersion(): string;
  configureClient(
    clientId: string,
    endUserId: string,
    timezone: string | null
  ): string | null;
  configureDevelopmentClient(
    clientId: string,
    apiKey: string,
    endUserId: string,
    timezone: string | null
  ): string | null;
  disposeClient(clientId: string): void;
  resolveTokenRequest(
    requestId: string,
    token: string,
    expiresIn: number
  ): void;
  rejectTokenRequest(
    requestId: string,
    message: string,
    retryable: boolean
  ): void;
  foodsSearch(
    clientId: string,
    query: string,
    category: string | null,
    limit: number
  ): Promise<string>;
  foodsAutocomplete(
    clientId: string,
    query: string,
    category: string | null,
    limit: number
  ): Promise<string>;
  foodsGet(clientId: string, foodId: string): Promise<string>;
  foodsLookupBarcode(clientId: string, upc: string): Promise<string>;
  foodsSuggestAlternatives(
    clientId: string,
    foodId: string,
    dietRestrictionsJson: string,
    dietPreferencesJson: string
  ): Promise<string>;
  restaurantsSearch(
    clientId: string,
    query: string,
    latitude: number,
    longitude: number,
    radius: number,
    limit: number
  ): Promise<string>;
  restaurantMenuItemsSearch(
    clientId: string,
    query: string,
    latitude: number,
    longitude: number,
    radius: number,
    limit: number
  ): Promise<string>;
  restaurantMenuItems(
    clientId: string,
    restaurantId: string,
    limit: number,
    offset: number
  ): Promise<string>;
  foodAnalysisAnalyzePhoto(
    clientId: string,
    image: string,
    reasoningEffort: string | null
  ): Promise<string>;
  foodAnalysisAnalyzeDescription(
    clientId: string,
    query: string
  ): Promise<string>;
  foodAnalysisCorrect(
    clientId: string,
    analysisJson: string,
    instruction: string
  ): Promise<string>;
  foodLogsList(clientId: string, start: string, end: string): Promise<string>;
  foodLogsGetSummary(
    clientId: string,
    start: string,
    end: string,
    groupBy: string,
    weekStart: string
  ): Promise<string>;
  foodLogsCreate(
    clientId: string,
    foodsJson: string,
    timestampUtc: string | null,
    name: string | null
  ): Promise<string>;
  foodLogsUpdate(
    clientId: string,
    id: string,
    foodsJson: string | null,
    timestampUtc: string | null,
    name: string | null
  ): Promise<string>;
  foodLogsDelete(clientId: string, id: string): Promise<string>;
  glucosePredict(clientId: string, requestJson: string): Promise<string>;
  voiceCaptureIsSupported(): boolean;
  voiceCaptureStart(sessionId: string, locale: string | null): Promise<string>;
  voiceCaptureStop(sessionId: string): Promise<string>;
  voiceCaptureCancel(sessionId: string): void;
  voiceCaptureDispose(sessionId: string): void;
  readonly onTokenRequested: CodegenTypes.EventEmitter<TokenRequest>;
  readonly onVoiceCaptureUpdate: CodegenTypes.EventEmitter<VoiceCaptureUpdate>;
}

export default TurboModuleRegistry.get<Spec>('JanuaryReactNative');
