import type {
  FoodLog,
  FoodScan,
  FoodCategoryValue,
  FoodSearchItem,
  FoodSearchResults,
  GlucosePrediction,
} from '@januaryai/react-native';

export async function searchFixtureFoods(
  query: string,
  category?: FoodCategoryValue
): Promise<FoodSearchResults> {
  await fixtureDelay();

  switch (query.toLowerCase()) {
    case 'force error':
      throw new Error('Fixture request failed.');
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
    case 'missing serving': {
      const item = fixtureFood('Missing serving fixture', 'generic');
      return { items: [{ ...item, servings: [] }], totalCount: 1 };
    }
    case 'category': {
      const label = category ?? 'all';
      const item = fixtureFood(`${capitalize(label)} category fixture`, label);
      return { items: [item], totalCount: 1 };
    }
    default:
      return defaultFixtureFoods();
  }
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

export const fixtureScan: FoodScan = {
  mealName: 'Fixture breakfast',
  totalNutrients: {
    calories: { value: 420, unit: 'cal' },
    protein: { value: 24, unit: 'g' },
    carbohydrates: { value: 48, unit: 'g' },
    totalFat: { value: 14, unit: 'g' },
  },
  detections: [
    {
      confidenceScore: 'high',
      food: {
        id: 'fixture-oatmeal',
        name: 'Oatmeal with berries',
        nutrients: {
          calories: { value: 300, unit: 'cal' },
          protein: { value: 10, unit: 'g' },
          carbohydrates: { value: 44, unit: 'g' },
          totalFat: { value: 8, unit: 'g' },
        },
        servings: [
          {
            id: 'fixture-oatmeal-serving',
            quantity: 1,
            selectedQuantity: 1,
            unit: 'bowl',
          },
        ],
      },
    },
    {
      confidenceScore: 'medium',
      food: {
        id: 'fixture-coffee',
        name: 'Coffee with milk',
        nutrients: {
          calories: { value: 120, unit: 'cal' },
          protein: { value: 14, unit: 'g' },
          carbohydrates: { value: 4, unit: 'g' },
          totalFat: { value: 6, unit: 'g' },
        },
        servings: [
          {
            id: 'fixture-coffee-serving',
            quantity: 1,
            selectedQuantity: 1,
            unit: 'cup',
          },
        ],
      },
    },
  ],
};

export const fixtureFoodLogs: FoodLog[] = [
  {
    id: 'fixture-log-breakfast',
    name: 'Fixture breakfast',
    timestampUTC: new Date().toISOString(),
    foods: [
      {
        id: 'fixture-oatmeal',
        name: 'Oatmeal with berries',
        nutrients: fixtureScan.detections[0]!.food.nutrients,
        consumedServing: { id: 'fixture-oatmeal-serving', quantity: 1 },
        servingDetails: {
          id: 'fixture-oatmeal-serving',
          quantity: 1,
          unit: 'bowl',
        },
      },
    ],
  },
];

export const fixtureGlucosePrediction: GlucosePrediction = {
  impact: 'medium',
  chart: { min: 92, max: 142 },
  prediction: [
    { minutes: 0, value: 96 },
    { minutes: 30, value: 124 },
    { minutes: 60, value: 142 },
    { minutes: 90, value: 126 },
    { minutes: 120, value: 108 },
    { minutes: 180, value: 94 },
  ],
};

const attempts = new Set<string>();

export async function analyzeFixturePhoto(image: string): Promise<FoodScan> {
  await fixtureDelay();
  if (image.includes('#retry') && takeFirstAttempt('scan-analysis')) {
    throw new Error('Temporary fixture scan failure.');
  }
  return fixtureScan;
}

export async function correctFixtureScan(
  instruction: string
): Promise<FoodScan> {
  await fixtureDelay();
  if (
    instruction.toLowerCase().includes('retry') &&
    takeFirstAttempt('scan-correction')
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
    throw new Error('Temporary fixture prediction failure.');
  }
  return fixtureGlucosePrediction;
}

export async function fixtureDelay(milliseconds = 2000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function takeFirstAttempt(key: string): boolean {
  if (attempts.has(key)) return false;
  attempts.add(key);
  return true;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
