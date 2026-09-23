import { describe, expect, it } from '@jest/globals';

import { nutrientAmount } from '../foodNutrients';

const food = {
  id: 'oats',
  servings: [],
  type: 'generic' as const,
};

describe('food nutrients', () => {
  it('reads a nutrient from the food, then from its nutrients', () => {
    expect(nutrientAmount({ ...food, calories: 150 }, 'calories')).toBe(150);
    expect(
      nutrientAmount(
        { ...food, nutrients: { protein: { unit: 'g', value: 5 } } },
        'protein'
      )
    ).toBe(5);
  });

  it('reports a nutrient January did not return as missing, not as a guess', () => {
    expect(nutrientAmount(food, 'calories')).toBeUndefined();
    expect(nutrientAmount(food, 'sodium')).toBeUndefined();
    expect(nutrientAmount({ ...food, totalFat: 0 }, 'totalFat')).toBe(0);
  });
});
