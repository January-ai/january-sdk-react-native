import type { FoodSearchItem, NutritionFacts } from '@januaryai/react-native';

type Nutrient = keyof NutritionFacts &
  keyof Pick<
    FoodSearchItem,
    'calories' | 'carbohydrates' | 'fiber' | 'protein' | 'sodium' | 'totalFat'
  >;

/**
 * A nutrient of one serving as January reported it: the food's own field,
 * else its `nutrients` entry. Undefined when January reported neither, which
 * the screens show as a dash rather than a made-up amount.
 */
export function nutrientAmount(
  food: FoodSearchItem,
  nutrient: Nutrient
): number | undefined {
  return food[nutrient] ?? food.nutrients?.[nutrient]?.value;
}
