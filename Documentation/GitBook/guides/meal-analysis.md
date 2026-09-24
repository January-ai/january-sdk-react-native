# Meal analysis

Analyze a natural-language meal description:

```ts
const scan = await january.foodAnalysis.analyzeDescription({
  query: 'two eggs, avocado toast, and black coffee',
});
```

Analyze a remote image URL or base64 data URI:

```ts
const scan = await january.foodAnalysis.analyzePhoto({
  image: imageUrlOrDataUri,
});
```

The API uses the reasoning-based analyzer by default. Pass
`reasoningEffort: 'none'` for the standard analyzer (`'xhigh'` asks for the
reasoning-based one explicitly); the result shape and cost are the same.

Each detection's `food` carries the selected catalog `serving` (`id`,
`quantity`, `unit`, where `quantity` is the size of one serving) and the
`quantity` eaten, so a detection logs without another lookup:

```ts
const foods = scan.detections.flatMap((detection) => {
  const { id, serving, quantity } = detection.food;
  // Skip a detection the API could not size rather than inventing a quantity;
  // let the user pick a serving for it instead.
  if (!id || !serving.id || quantity == null) return [];
  return [{ id, serving: { id: serving.id, quantity } }];
});
```

`nutrients` on each detection are already scaled to `quantity`.

Correct a prior result by passing the complete analysis and an instruction:

```ts
const corrected = await january.foodAnalysis.correct({
  analysis: scan,
  instruction: 'The drink was unsweetened and there was only one slice of toast',
});
```

The React Native package exposes analysis APIs but does not bundle a camera UI.
Use the application’s preferred camera or image-picker library, then pass a
supported URL or data URI to the SDK.
