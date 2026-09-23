import { describe, expect, it } from '@jest/globals';
import type { FoodLog } from '@januaryai/react-native';

import { foodsAfterAdding } from '../foodLogEdits';

const log: FoodLog = {
  id: 'log-1',
  name: 'Breakfast',
  timestampUTC: '2026-09-22T12:00:00Z',
  foods: [
    {
      id: 'oats',
      name: 'Oats',
      nutrients: {},
      consumedServing: { id: 'cup', quantity: 1.5 },
      servingDetails: { id: 'cup', quantity: 1, unit: 'cup' },
    },
  ],
};

describe('adding foods to a saved food log', () => {
  it('leaves the foods alone when none was added', () => {
    expect(foodsAfterAdding(log, [])).toBeUndefined();
  });

  it('keeps the logged foods, as logged, ahead of the added ones', () => {
    expect(
      foodsAfterAdding(log, [
        { id: 'banana', serving: { id: 'medium', quantity: 1 } },
      ])
    ).toEqual([
      { id: 'oats', serving: { id: 'cup', quantity: 1.5 } },
      { id: 'banana', serving: { id: 'medium', quantity: 1 } },
    ]);
  });

  it('refuses rather than drop a logged food it cannot send back', () => {
    const withoutIds: FoodLog = {
      ...log,
      foods: [
        {
          name: 'Mystery stew',
          nutrients: {},
          consumedServing: {},
          servingDetails: {},
        },
      ],
    };
    expect(() =>
      foodsAfterAdding(withoutIds, [
        { id: 'banana', serving: { id: 'medium', quantity: 1 } },
      ])
    ).toThrow(
      "Mystery stew has no food or serving ID, so foods can't be added"
    );
  });
});
