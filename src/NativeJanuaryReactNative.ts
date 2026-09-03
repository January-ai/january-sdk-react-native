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
  foodAnalysisAnalyzePhoto(clientId: string, image: string): Promise<string>;
  foodAnalysisCorrect(
    clientId: string,
    analysisJson: string,
    instruction: string
  ): Promise<string>;
  foodLogsList(clientId: string, start: string, end: string): Promise<string>;
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
  readonly onTokenRequested: CodegenTypes.EventEmitter<TokenRequest>;
}

export default TurboModuleRegistry.get<Spec>('JanuaryReactNative');
