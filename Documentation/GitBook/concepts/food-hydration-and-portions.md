# Food hydration and portions

Use a three-stage flow whenever a feature needs a concrete consumed food:

1. Discover with `foods.search`, `foods.autocomplete`, or barcode lookup.
2. Hydrate the selected item with `foods.get`.
3. Select a serving ID and positive quantity.

```ts
const result = await january.foods.search({ query: 'oatmeal' });
const summary = result.items[0];
if (!summary) return;

const food = await january.foods.get({ foodId: summary.id });
const serving = food.servings.find((item) => item.isPrimary) ?? food.servings[0];
if (!serving?.id) return;

const selection = {
  id: food.id,
  serving: { id: serving.id, quantity: 1 },
};
```

Pass the resulting `FoodSelection` to food logs or glucose prediction. Do not
infer serving IDs from labels, and do not submit zero or negative quantities.
