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
