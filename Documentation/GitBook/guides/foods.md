# Foods

Every call on this page needs the `foods:read` scope. To turn a result into
something you can log, see [Food details and portions](../concepts/food-hydration-and-portions.md).

## Autocomplete

```ts
const { items: suggestions } = await january.foods.autocomplete({
  query: 'greek yog',
  category: 'generic',
  limit: 8,
});
```

Autocomplete takes `category: 'generic'` or `'branded'`. Search also takes
`'recipe'`.

## Search and fetch the full food

```ts
const results = await january.foods.search({
  query: 'greek yogurt',
  category: 'generic',
  limit: 20,
});

const first = results.items[0];
if (first) {
  const food = await january.foods.get({ foodId: first.id });
}
```

Search and autocomplete results can leave out fields the full food has, so
render optional fields defensively.

## Barcode lookup

Barcode coverage is US-only. A code issued outside the United States (for
example GS1 prefixes 73, 64, 54, or 93) isn't in the database, and the call
rejects with `not_found`. Fall back to text search:

```ts
try {
  const { items } = await january.foods.lookupBarcode({ upc: '012345678905' });
  showFoods(items);
} catch (error) {
  if ((error as { code?: string }).code === 'not_found') {
    // Not in the database: offer text search instead.
  }
}
```

## Alternatives

```ts
const { alternatives } = await january.foods.suggestAlternatives({
  foodId: food.id,
  dietRestrictions: ['gluten'],
  dietPreferences: ['high_protein'],
});
```
