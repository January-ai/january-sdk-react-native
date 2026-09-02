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

export interface ServingSelection {
  id: string;
  quantity: number;
}

export interface FoodSelection {
  id: string;
  serving: ServingSelection;
}

export interface AnalyzePhotoRequest {
  /** A base64 data URI or a remote image URL accepted by January. */
  image: string;
}

export interface DetectedServing {
  id?: string;
  quantity?: number;
  selectedQuantity?: number;
  unit?: string;
}

export interface DetectedFood {
  brandName?: string;
  id?: string;
  name?: string;
  nutrients: NutritionFacts;
  servings?: DetectedServing[];
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

export interface GlucosePredictionProfile {
  activityLevel?: ActivityLevel;
  age: number;
  healthConditions?: MedicalCondition[];
  height: { unit: 'in' | 'cm'; value: number };
  sex: Sex;
  weight: { unit: 'lb' | 'kg'; value: number };
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
