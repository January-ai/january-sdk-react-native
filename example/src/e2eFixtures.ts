import type {
  AutocompleteFoodsResponse,
  FoodLog,
  FoodScan,
  FoodCategoryValue,
  FoodSearchItem,
  FoodSearchResults,
  GlucosePrediction,
  SuggestFoodAlternativesResponse,
} from '@januaryai/react-native';

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
  await fixtureDelay();

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

export const fixtureScan: FoodScan = {
  mealName: 'Fixture breakfast',
  totalNutrients: {
    calories: { value: 100, unit: 'cal' },
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
          calories: { value: 100, unit: 'cal' },
          protein: { value: 4, unit: 'g' },
          carbohydrates: { value: 20, unit: 'g' },
          totalFat: { value: 2, unit: 'g' },
          fiber: { value: 3, unit: 'g' },
          sodium: { value: 10, unit: 'mg' },
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
  ],
};

export async function analyzeFixtureDescription(
  query: string
): Promise<FoodScan> {
  await fixtureDelay();
  if (query.toLowerCase().includes('error')) {
    throw new Error('Fixture request failed.');
  }
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

export const fixtureFoodLogs: FoodLog[] = [
  {
    id: 'fixture-log-breakfast',
    name: 'Fixture breakfast',
    timestampUTC: '2026-08-31T12:00:00Z',
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
          unit: 'bowl',
        },
      },
    ],
  },
];

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
            selectedQuantity: 1,
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

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
