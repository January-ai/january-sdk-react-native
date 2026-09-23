import { describe, expect, it } from '@jest/globals';

import {
  formatGrams,
  menuItemCaption,
  primaryServing,
  restaurantCaption,
  servingLabel,
  toMenuItemView,
  toRestaurantMenuView,
  toRestaurantView,
} from '../restaurantViews';

describe('restaurant views', () => {
  it('keeps nutrients January did not report undefined instead of zero', () => {
    const view = toMenuItemView({
      id: 'menu-1',
      name: 'Veggie burrito',
      restaurantName: 'Taqueria',
      calories: 640,
      servings: [],
      type: 'menu_item',
    });
    expect(view.calories).toBe(640);
    expect(view.protein).toBeUndefined();
    expect(view.fat).toBeUndefined();
    expect(view.netCarbohydrates).toBeUndefined();
    expect(formatGrams(view.fiber)).toBe('—');
    expect(formatGrams(12.34)).toBe('12.3 g');
  });

  it('leaves unknown calories out of a caption rather than showing 0 cal', () => {
    const known = toRestaurantMenuView(
      { calories: 420.4, servings: [], name: 'Bowl' },
      'Cafe'
    );
    const unknown = toRestaurantMenuView(
      { servings: [], name: 'Soup' },
      'Cafe'
    );
    expect(menuItemCaption(known)).toBe('Cafe · 420.4 cal');
    expect(menuItemCaption(unknown)).toBe('Cafe');
  });

  it('describes the primary serving, or the first, with its weight', () => {
    const servings = [
      { id: 'a', quantity: 1, scalingFactor: 1, unit: 'slice' },
      {
        id: 'b',
        isPrimary: true,
        quantity: 1,
        scalingFactor: 2,
        unit: 'bowl',
        weightGrams: 340,
      },
    ];
    expect(primaryServing(servings)?.id).toBe('b');
    expect(servingLabel(primaryServing(servings))).toBe('1 bowl · 340 g');
    expect(servingLabel(servings[0])).toBe('1 slice');
    expect(primaryServing([])).toBeUndefined();
    expect(servingLabel(undefined)).toBeUndefined();
    expect(servingLabel({ scalingFactor: 1 })).toBeUndefined();
  });

  it('converts a distance in meters to miles, and omits a missing one', () => {
    const near = toRestaurantView({
      id: 'r1',
      name: 'Cafe',
      address1: '1 Main St',
      distance: 1609.344,
      type: 'restaurant',
    });
    const unknown = toRestaurantView({ id: 'r2', type: 'restaurant' });
    expect(restaurantCaption(near)).toBe('1 Main St · 1.0 mi');
    expect(unknown.distanceMiles).toBeUndefined();
    expect(restaurantCaption(unknown)).toBe('Location unavailable');
  });
});
