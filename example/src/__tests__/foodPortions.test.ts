import { describe, expect, it } from '@jest/globals';

import {
  portionSelection,
  servingsIn,
  servingsScale,
  wholeServing,
} from '../foodPortions';

// January's greek yogurt: 100 kcal per "6 oz" serving. The API reads a
// selection's quantity as a count of servings, so sending 6 logs 600 kcal.
const sixOunces = {
  id: 'yogurt-6-oz',
  isPrimary: true,
  quantity: 6,
  scalingFactor: 1,
  unit: 'oz',
};

describe('portion selection', () => {
  it('sends one serving for the default portion of a 6 oz serving', () => {
    expect(portionSelection('yogurt', sixOunces)).toEqual({
      id: 'yogurt',
      serving: { id: 'yogurt-6-oz', quantity: 1 },
    });
  });

  it('sends the number of servings in an amount, not the amount', () => {
    expect(portionSelection('yogurt', sixOunces, 12)?.serving.quantity).toBe(2);
    expect(portionSelection('yogurt', sixOunces, 3)?.serving.quantity).toBe(
      0.5
    );
  });

  it('sends nothing for a serving without an ID', () => {
    expect(
      portionSelection('yogurt', { ...sixOunces, id: undefined })
    ).toBeUndefined();
    expect(portionSelection('yogurt', undefined)).toBeUndefined();
  });
});

describe('servings', () => {
  it('reads one whole serving in the serving’s unit', () => {
    expect(wholeServing(sixOunces)).toBe(6);
    expect(wholeServing({ quantity: 0 })).toBe(1);
    expect(wholeServing({})).toBe(1);
    expect(wholeServing(undefined)).toBe(1);
  });

  it('counts the servings in an amount of the serving’s unit', () => {
    expect(servingsIn(6, sixOunces)).toBe(1);
    expect(servingsIn(1, sixOunces)).toBeCloseTo(1 / 6);
    expect(servingsIn(2, undefined)).toBe(2);
  });

  it('scales per-serving nutrients by the count and the scaling factor', () => {
    expect(100 * servingsScale(1, sixOunces)).toBe(100);
    expect(100 * servingsScale(servingsIn(3, sixOunces), sixOunces)).toBe(50);
    expect(servingsScale(2, { scalingFactor: 1.5 })).toBe(3);
    expect(servingsScale(2, undefined)).toBe(2);
  });
});
