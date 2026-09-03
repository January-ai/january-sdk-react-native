# First request

Search for foods after constructing the client:

```ts
import { FoodCategory, JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: session.user.id,
  clientTokenProvider: getJanuaryClientToken,
});

const search = await january.foods.search({
  query: 'greek yogurt',
  category: FoodCategory.generic,
  limit: 10,
});

const first = search.items[0];
if (first) {
  const food = await january.foods.get({ foodId: first.id });
  console.log(food.name, food.servings);
}
```

Search results are discovery records. Hydrate the selected food with
`foods.get`, let the user select a serving and quantity, and retain those IDs
for food logs or glucose prediction.

Dispose the client when its signed-in user session ends:

```ts
january.dispose();
```
