# Restaurants

Every call on this page needs the `restaurants:read` scope.

## Search nearby

Search restaurants, or menu items across nearby restaurants, by query and
coordinates. `radius` is in meters and defaults to 8,000; `limit` defaults
to 10.

```ts
const restaurants = await january.restaurants.search({
  query: 'mediterranean',
  latitude: 40.741,
  longitude: -73.989,
  radius: 5_000,
});

const menuItems = await january.restaurants.searchMenuItems({
  query: 'chicken bowl',
  latitude: 40.741,
  longitude: -73.989,
});
```

The SDK takes coordinates but doesn't request location permission or track
location. Ask for permission in your app before reading the device's position.

## A restaurant's menu

`getMenuItems` returns one page of a restaurant's menu: `limit` defaults to
100 (the maximum) and `offset` to 0. The response has no total, so keep paging
until a page comes back shorter than `limit`:

```ts
import type { JanuaryClient, RestaurantMenuEntry } from '@januaryai/react-native';

export async function loadMenu(january: JanuaryClient, restaurantId: string) {
  const items: RestaurantMenuEntry[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const page = await january.restaurants.getMenuItems({ restaurantId, limit, offset });
    items.push(...page.items);
    if (page.items.length < limit) return items;
  }
}

const nearest = restaurants.items[0];
if (nearest) {
  const menu = await loadMenu(january, nearest.id);
}
```
