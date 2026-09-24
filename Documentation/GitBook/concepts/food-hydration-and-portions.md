# Food details and portions

Logging a food or predicting glucose takes a `FoodSelection`: a food ID, a
serving ID, and a quantity. Build one in three steps:

1. Find the food with `foods.search`, `foods.autocomplete`, or
   `foods.lookupBarcode`.
2. Fetch the full food with `foods.get`. Search and autocomplete results can
   carry less detail.
3. Pick one of its servings and a quantity greater than zero.

```ts
import type { FoodSelection, JanuaryClient } from '@januaryai/react-native';

export async function selectFood(
  january: JanuaryClient,
  query: string,
  quantity = 1
): Promise<FoodSelection | undefined> {
  const { items } = await january.foods.search({ query });
  const match = items[0]; // in your UI, the result the user picked
  if (!match) return undefined;

  const food = await january.foods.get({ foodId: match.id });
  const serving = food.servings.find((s) => s.isPrimary) ?? food.servings[0];
  if (!serving?.id) return undefined;

  return { id: food.id, serving: { id: serving.id, quantity } };
}
```

`quantity` is how many of that serving were eaten. Take serving IDs from
`food.servings` as returned; don't build them from labels.

A [food analysis](../guides/meal-analysis.md) detection already carries a
serving and a quantity, so it can be logged without these steps.
