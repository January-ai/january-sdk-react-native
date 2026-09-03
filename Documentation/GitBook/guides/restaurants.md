# Restaurants

Search nearby restaurants with a query, coordinates, radius in meters, and
optional result limit:

```ts
const restaurants = await january.restaurants.search({
  query: 'mediterranean',
  latitude: 40.741,
  longitude: -73.989,
  radius: 8_000,
  limit: 10,
});
```

Search menu items across nearby restaurants:

```ts
const menuItems = await january.restaurants.searchMenuItems({
  query: 'chicken bowl',
  latitude: 40.741,
  longitude: -73.989,
});
```

Fetch one restaurant’s menu:

```ts
const menu = await january.restaurants.getMenuItems({
  restaurantId: restaurants.items[0].id,
  limit: 50,
  offset: 0,
});
```

Request location permission in the application before reading device
coordinates. The SDK accepts coordinates but does not request permission or
track location.
