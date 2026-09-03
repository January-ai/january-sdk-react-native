# Foods

## Autocomplete

```ts
const suggestions = await january.foods.autocomplete({
  query: 'greek yog',
  category: 'generic',
  limit: 8,
});
```

## Search and hydrate

```ts
const results = await january.foods.search({
  query: 'greek yogurt',
  category: 'generic',
  limit: 20,
});

const food = await january.foods.get({ foodId: results.items[0].id });
```

## Barcode lookup

```ts
const results = await january.foods.lookupBarcode({ upc: '012345678905' });
```

## Alternatives

```ts
const response = await january.foods.suggestAlternatives({
  foodId: food.id,
  dietRestrictions: ['gluten'],
  dietPreferences: ['high_protein'],
});
```

Render missing optional fields defensively. Search and autocomplete records may
contain less detail than a hydrated food.
