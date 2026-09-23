import type {
  Restaurant,
  RestaurantMenuEntry,
  RestaurantMenuItem,
  ServingOption,
} from '@januaryai/react-native';

const METERS_PER_MILE = 1609.344;

/** A restaurant as the restaurant screens show it. */
export interface RestaurantView {
  id: string;
  name: string;
  city: string;
  address: string;
  /** Undefined when January did not report a distance. */
  distanceMiles?: number;
}

/**
 * A menu item as the restaurant screens show it. Nutrients January did not
 * report stay undefined and show as a dash, never as zero.
 */
export interface MenuItemView {
  id: string;
  name: string;
  restaurantName: string;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  netCarbohydrates?: number;
  totalSugars?: number;
  servings: ServingOption[];
}

export function toRestaurantView(restaurant: Restaurant): RestaurantView {
  const address = [restaurant.address1, restaurant.address2]
    .filter(Boolean)
    .join(', ');
  return {
    id: restaurant.id,
    name: restaurant.name ?? 'Restaurant',
    city: restaurant.city ?? '—',
    address: address || restaurant.city || 'Location unavailable',
    distanceMiles:
      restaurant.distance == null
        ? undefined
        : restaurant.distance / METERS_PER_MILE,
  };
}

export function toMenuItemView(item: RestaurantMenuItem): MenuItemView {
  return {
    id: item.id,
    name: item.name ?? 'Menu item',
    restaurantName: item.restaurantName ?? 'Restaurant',
    ...nutrients(item),
    servings: item.servings,
  };
}

export function toRestaurantMenuView(
  item: RestaurantMenuEntry,
  restaurantName: string
): MenuItemView {
  return {
    id: item.id ?? `${restaurantName}-${item.name ?? 'menu-item'}`,
    name: item.name ?? 'Menu item',
    restaurantName,
    ...nutrients(item),
    servings: item.servings,
  };
}

function nutrients(item: RestaurantMenuEntry | RestaurantMenuItem) {
  return {
    calories: item.calories,
    protein: item.protein,
    carbohydrates: item.carbohydrates,
    fat: item.totalFat,
    fiber: item.fiber,
    netCarbohydrates: item.netCarbohydrates,
    totalSugars: item.totalSugars,
  };
}

/** The serving a menu item's nutrition is given for: its primary, else the first. */
export function primaryServing(
  servings: readonly ServingOption[]
): ServingOption | undefined {
  return servings.find((serving) => serving.isPrimary) ?? servings[0];
}

/** "1 bowl · 340 g", or undefined when the item has no serving. */
export function servingLabel(
  serving: ServingOption | undefined
): string | undefined {
  if (!serving) return undefined;
  const size = [serving.quantity, serving.unit]
    .filter((part) => part != null && part !== '')
    .join(' ');
  const weight =
    serving.weightGrams != null ? `${formatAmount(serving.weightGrams)} g` : '';
  const label = [size, weight].filter(Boolean).join(' · ');
  return label || undefined;
}

/** "12 g", or a dash when January did not report the amount. */
export function formatGrams(value: number | undefined): string {
  return value == null ? '—' : `${formatAmount(value)} g`;
}

/** "Fixture Cafe · 420 cal", leaving out calories January did not report. */
export function menuItemCaption(item: MenuItemView): string {
  return item.calories == null
    ? item.restaurantName
    : `${item.restaurantName} · ${formatAmount(item.calories)} cal`;
}

/** "123 Main St · 0.7 mi", leaving out a distance January did not report. */
export function restaurantCaption(restaurant: RestaurantView): string {
  return restaurant.distanceMiles == null
    ? restaurant.address
    : `${restaurant.address} · ${restaurant.distanceMiles.toFixed(1)} mi`;
}

function formatAmount(value: number): string {
  return String(Math.round(value * 10) / 10);
}
