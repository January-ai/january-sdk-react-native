export const FoodCategory = {
  branded: 'branded',
  generic: 'generic',
  recipe: 'recipe',
} as const;

export type FoodCategoryValue =
  (typeof FoodCategory)[keyof typeof FoodCategory];

export interface JanuaryClientToken {
  token: string;
  expiresIn: number;
}

export type JanuaryTokenProvider = (
  endUserId: string
) => Promise<JanuaryClientToken>;

interface JanuaryClientBaseOptions {
  endUserId: string;
  timezone?: string;
}

export interface JanuaryProductionClientOptions extends JanuaryClientBaseOptions {
  clientTokenProvider: JanuaryTokenProvider;
  developmentApiKey?: never;
}

/** Local debug builds only. Never ship a January API key in an application. */
export interface JanuaryDevelopmentClientOptions extends JanuaryClientBaseOptions {
  clientTokenProvider?: never;
  developmentApiKey: string;
}

export type JanuaryClientOptions =
  JanuaryProductionClientOptions | JanuaryDevelopmentClientOptions;

export interface SearchFoodsRequest {
  category?: FoodCategoryValue;
  limit?: number;
  query: string;
}

export type AutocompleteFoodCategory = 'generic' | 'branded';

export interface AutocompleteFoodsRequest {
  category?: AutocompleteFoodCategory;
  limit?: number;
  query: string;
}

export interface FoodSuggestion {
  brandName?: string;
  id: string;
  imageURL?: string;
  name?: string;
  nutrients?: NutritionFacts;
}

export interface AutocompleteFoodsResponse {
  items: FoodSuggestion[];
}

export interface GetFoodRequest {
  foodId: string;
}

export interface LookupFoodByBarcodeRequest {
  upc: string;
}

export interface AnalyzeDescriptionRequest {
  query: string;
}

export type DietRestriction =
  | 'gluten'
  | 'lactose'
  | 'yeast'
  | 'tree_nuts'
  | 'peanuts'
  | 'dairy'
  | 'eggs'
  | 'sulfites'
  | 'soy'
  | 'wheat'
  | 'shellfish'
  | 'fish'
  | 'mushrooms'
  | 'sesame'
  | 'msg'
  | 'caffeine'
  | 'fodmaps';

export type DietPreference =
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo'
  | 'pescatarian'
  | 'low_carbohydrate'
  | 'high_protein'
  | 'kosher'
  | 'halal';

export interface SuggestFoodAlternativesRequest {
  dietPreferences?: DietPreference[];
  dietRestrictions?: DietRestriction[];
  foodId: string;
}

export interface SuggestFoodAlternativesResponse {
  alternatives: AlternativeFood[];
}

export interface NutrientAmount {
  unit: string;
  value: number;
}

export interface NutritionFacts {
  addedSugars?: NutrientAmount;
  calcium?: NutrientAmount;
  calories?: NutrientAmount;
  carbohydrates?: NutrientAmount;
  cholesterol?: NutrientAmount;
  fiber?: NutrientAmount;
  iron?: NutrientAmount;
  netCarbohydrates?: NutrientAmount;
  potassium?: NutrientAmount;
  protein?: NutrientAmount;
  saturatedFat?: NutrientAmount;
  sodium?: NutrientAmount;
  totalFat?: NutrientAmount;
  totalSugars?: NutrientAmount;
  transFat?: NutrientAmount;
  vitaminD?: NutrientAmount;
}

export interface ServingOption {
  id?: string;
  isPrimary?: boolean;
  quantity?: number;
  scalingFactor: number;
  unit?: string;
  weightGrams?: number;
}

export interface FoodSearchItem {
  addedSugars?: number;
  barcode?: string;
  brandName?: string;
  calories?: number;
  carbohydrates?: number;
  cholesterol?: number;
  fiber?: number;
  glycemicIndex?: number;
  glycemicLoad?: number;
  id: string;
  name?: string;
  netCarbohydrates?: number;
  nutrients?: NutritionFacts;
  photoURL?: string;
  potassium?: number;
  protein?: number;
  saturatedFat?: number;
  servings: ServingOption[];
  sodium?: number;
  totalFat?: number;
  totalSugars?: number;
  type: FoodCategoryValue;
}

export interface FoodSearchResults {
  items: FoodSearchItem[];
  totalCount: number;
}

export interface SearchRestaurantsRequest {
  limit?: number;
  latitude: number;
  longitude: number;
  query: string;
  /** Search radius in meters. Defaults to 8,000. */
  radius?: number;
}

export type RestaurantResultType = 'restaurant' | 'menu_item';

export interface Restaurant {
  address1?: string;
  address2?: string;
  city?: string;
  distance?: number;
  id: string;
  isChain?: boolean;
  name?: string;
  type: RestaurantResultType;
}

export interface SearchRestaurantsResponse {
  items: Restaurant[];
  totalCount: number;
}

export interface RestaurantMenuItem {
  addedSugars?: number;
  calories?: number;
  carbohydrates?: number;
  distance?: number;
  fiber?: number;
  glycemicIndex?: number;
  glycemicLoad?: number;
  id: string;
  isChain?: boolean;
  name?: string;
  netCarbohydrates?: number;
  photoURL?: string;
  protein?: number;
  restaurantName?: string;
  servings: ServingOption[];
  totalFat?: number;
  totalSugars?: number;
  type: string;
}

export interface SearchRestaurantMenuItemsResponse {
  items: RestaurantMenuItem[];
  totalCount: number;
}

export interface GetRestaurantMenuItemsRequest {
  limit?: number;
  offset?: number;
  restaurantId: string;
}

export interface RestaurantMenuEntry {
  addedSugars?: number;
  calories?: number;
  carbohydrates?: number;
  fiber?: number;
  glycemicIndex?: number;
  glycemicLoad?: number;
  id?: string;
  name?: string;
  netCarbohydrates?: number;
  protein?: number;
  servings: ServingOption[];
  totalFat?: number;
  totalSugars?: number;
}

export interface GetRestaurantMenuItemsResponse {
  items: RestaurantMenuEntry[];
}

export interface ServingSelection {
  id: string;
  quantity: number;
}

export interface FoodSelection {
  id: string;
  serving: ServingSelection;
}

/** How much analysis effort a photo scan uses. Both modes return the same FoodScan and cost the same. */
export type AnalysisEffort = 'none' | 'xhigh';

export interface AnalyzePhotoRequest {
  /** A base64 data URI or a remote image URL accepted by January. */
  image: string;
  /** Omit or `'none'` for the standard analyzer; `'xhigh'` for the reasoning-based one. */
  reasoningEffort?: AnalysisEffort;
}

/** The catalog serving a detected or alternative food is expressed in. `quantity` is the size of one serving, not the amount eaten. */
export interface ServingSummary {
  id?: string;
  quantity?: number;
  unit?: string;
}

/** @deprecated Use ServingSummary. The amount eaten is now DetectedFood.quantity. */
export type DetectedServing = ServingSummary;

/**
 * A food recognized from a photo or a description. `serving` is the selected catalog serving and
 * `quantity` is how many of that serving were eaten, so together they are ready to log.
 * `nutrients` are already scaled to `quantity`.
 */
export interface DetectedFood {
  brandName?: string;
  id?: string;
  name?: string;
  nutrients: NutritionFacts;
  quantity?: number;
  serving: ServingSummary;
}

/** A healthier alternative to a food, with the servings its nutrition can be read against. */
export interface AlternativeFood {
  brandName?: string;
  id?: string;
  name?: string;
  nutrients: NutritionFacts;
  servings: ServingSummary[];
}

export interface FoodDetection {
  confidenceScore?: 'high' | 'medium' | 'low';
  food: DetectedFood;
}

export interface FoodScan {
  detections: FoodDetection[];
  mealName?: string;
  totalNutrients: NutritionFacts;
}

export interface CorrectPhotoScanRequest {
  analysis: FoodScan;
  instruction: string;
}

export interface ConsumedServing {
  id?: string;
  quantity?: number;
}

export interface ServingDetails {
  id?: string;
  quantity?: number;
  unit?: string;
  weightGrams?: number;
}

export interface LoggedFood {
  brandName?: string;
  consumedServing: ConsumedServing;
  glycemicIndex?: number;
  glycemicLoad?: number;
  id?: string;
  imageURL?: string;
  name?: string;
  nutrients: NutritionFacts;
  servingDetails: ServingDetails;
}

export interface FoodLog {
  foods: LoggedFood[];
  id?: string;
  name?: string;
  timestampUTC: string;
}

export interface FoodLogList {
  items: FoodLog[];
  totalCount: number;
}

export interface ListFoodLogsRequest {
  end: string;
  start: string;
}

export type FoodLogSummaryGrouping = 'day' | 'week';
export type WeekStart = 'monday' | 'sunday';

/** Inclusive calendar dates (YYYY-MM-DD) in the client's timezone, at most 366 days apart. */
export interface GetFoodLogSummaryRequest {
  end: string;
  groupBy?: FoodLogSummaryGrouping;
  start: string;
  weekStart?: WeekStart;
}

/** One day or week of a summary. Buckets tile the range, so an empty period is present with zero counts. */
export interface FoodLogSummaryBucket {
  daysWithLogs: number;
  endDate: string;
  logsCount: number;
  /** Sparse: a nutrient is absent when nothing could be totalled. */
  nutrients: NutritionFacts;
  startDate: string;
}

export interface FoodLogSummaryTotals {
  daysWithLogs: number;
  logsCount: number;
  nutrients: NutritionFacts;
}

export interface FoodLogSummary {
  /** Totals divided by the number of days that have at least one log. */
  averagePerLoggedDay: { nutrients: NutritionFacts };
  buckets: FoodLogSummaryBucket[];
  endDate: string;
  groupBy: FoodLogSummaryGrouping;
  startDate: string;
  timezone: string;
  totals: FoodLogSummaryTotals;
  /** Absent when grouped by day. */
  weekStart?: WeekStart;
}

export interface CreateFoodLogRequest {
  foods: FoodSelection[];
  name?: string;
  timestampUTC?: string;
}

export interface UpdateFoodLogRequest {
  foods?: FoodSelection[];
  id: string;
  name?: string;
  timestampUTC?: string;
}

export type Sex = 'male' | 'female';
export type ActivityLevel =
  'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type MedicalCondition = 'type_2_diabetes' | 'prediabetes';

/** Weight units the API accepts. Responses may carry a unit newer than this SDK. */
export type WeightUnit = 'lb' | 'kg';

/** A body weight with its unit; 10–1000 lb or 4.5–453.6 kg when logging. */
export interface Weight {
  unit: WeightUnit;
  value: number;
}

export interface GlucosePredictionProfile {
  activityLevel?: ActivityLevel;
  /** Whole years; the API rejects fractions. */
  age: number;
  healthConditions?: MedicalCondition[];
  height: { unit: 'in' | 'cm'; value: number };
  sex: Sex;
  weight: Weight;
}

/** Volume units the API accepts. Responses may carry a unit newer than this SDK. */
export type VolumeUnit = 'fl_oz' | 'ml';

/** An amount of water to log: 1–811.5 fl_oz or 30–24000 ml. */
export interface WaterAmount {
  unit: VolumeUnit;
  value: number;
}

/** A total volume as the API reports it, rounded to one decimal place. */
export interface Volume {
  unit: VolumeUnit;
  value: number;
}

export interface WaterLog {
  /** The amount as logged, in the unit it was sent in. */
  amount: WaterAmount;
  /** When the water was consumed, in UTC. */
  consumedAt: string;
  /** Keep this to delete the log later. */
  id: string;
}

/** Everything logged on one local calendar day, in the unit the request asked for. */
export interface DailyWaterTotal {
  /** Local calendar date (YYYY-MM-DD) in the client's timezone. */
  date: string;
  total: Volume;
}

export interface ListWaterLogsResponse {
  /** One entry per day with water logged, oldest first; days with nothing logged are absent. */
  items: DailyWaterTotal[];
}

export interface CreateWaterLogRequest {
  amount: WaterAmount;
  /** ISO-8601 with an offset; omitted means now. Its day counts toward the daily cap. */
  consumedAt?: string;
}

/** Inclusive calendar dates (YYYY-MM-DD) in the client's timezone; at most 100 days are returned. */
export interface ListWaterLogsRequest {
  end: string;
  start: string;
  /** The unit every daily total is returned in. Defaults to fl_oz. */
  unit?: VolumeUnit;
}

export interface WeightLog {
  /** When the weight was measured, in UTC. */
  measuredAt: string;
  weight: Weight;
}

/** The latest weight measured on one local calendar day. */
export interface DailyWeight {
  /** Local calendar date (YYYY-MM-DD) in the client's timezone. */
  date: string;
  weight: Weight;
}

export interface ListWeightLogsResponse {
  /** One entry per day with a weight, oldest first; days without one are absent. */
  items: DailyWeight[];
}

export interface CreateWeightLogRequest {
  /** ISO-8601 with an offset; omitted means now. */
  measuredAt?: string;
  weight: Weight;
}

/** Inclusive calendar dates (YYYY-MM-DD) in the client's timezone; at most 100 days are returned. */
export interface ListWeightLogsRequest {
  end: string;
  start: string;
}

export interface PredictGlucoseRequest {
  foods: FoodSelection[];
  startTime: string;
  userProfile: GlucosePredictionProfile;
}

export interface GlucosePredictionPoint {
  minutes: number;
  value: number;
}

export interface GlucosePrediction {
  chart: { max?: number; min?: number };
  impact?: 'low' | 'medium' | 'high' | string;
  prediction: GlucosePredictionPoint[];
}
