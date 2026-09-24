# Food analysis

Every call on this page needs the `food_analysis:write` scope. An analysis can
take tens of seconds, so show progress.

## Analyze a description

```ts
const scan = await january.foodAnalysis.analyzeDescription({
  query: 'two eggs, avocado toast, and black coffee',
});
```

`analyzeDescription` takes only `query`.

## Analyze a photo

`analyzePhoto` takes a remote image URL or a base64 data URI. The SDK has no
camera UI; this sample uses `expo-image-picker`:

```ts
import * as ImagePicker from 'expo-image-picker';

const { granted } = await ImagePicker.requestCameraPermissionsAsync();
const picked = granted
  ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
  : undefined;
const asset = picked && !picked.canceled ? picked.assets[0] : undefined;
if (asset?.base64) {
  const scan = await january.foodAnalysis.analyzePhoto({
    image: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`,
  });
}
```

Keep photos to about 1,000 px on the longest edge, the size the iOS SDK's
`PhotoScanImage` sends. Resize with an image library such as
`expo-image-manipulator` before you encode the photo.

`analyzePhoto` uses the reasoning-based analyzer by default. Pass
`reasoningEffort: 'none'` for the standard one; the result shape and cost are
the same.

## Log a detection

Each detection's `food` is ready to log:

| Field | Meaning |
| --- | --- |
| `food.serving.id` | The catalog serving to log |
| `food.serving.quantity`, `food.serving.unit` | The size of one serving |
| `food.quantity` | Servings eaten; becomes `FoodSelection.serving.quantity` |
| `food.nutrients` | Already scaled to `food.quantity` |

The API always returns `food.id`, `food.serving.id`, and `food.quantity`, but
the TypeScript types mark them optional, so guard them:

```ts
const foods: FoodSelection[] = scan.detections.flatMap(({ food }) =>
  food.id && food.serving.id && food.quantity != null
    ? [{ id: food.id, serving: { id: food.serving.id, quantity: food.quantity } }]
    : []
);
```

Pass `foods` to [`foodLogs.create`](food-logs.md).

## Correct a result

Send the complete analysis and an instruction:

```ts
const corrected = await january.foodAnalysis.correct({
  analysis: scan,
  instruction: 'The drink was unsweetened and there was only one slice of toast',
});
```
