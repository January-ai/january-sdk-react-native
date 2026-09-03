# Glucose prediction

Glucose prediction combines selected foods, a start time, and a user profile:

```ts
const prediction = await january.glucose.predict({
  foods: [{
    id: food.id,
    serving: { id: serving.id!, quantity: 1 },
  }],
  startTime: new Date().toISOString(),
  userProfile: {
    age: 38,
    sex: 'female',
    height: { unit: 'cm', value: 168 },
    weight: { unit: 'kg', value: 67 },
    activityLevel: 'moderately_active',
    healthConditions: [],
  },
});
```

Metric and imperial profiles are both supported. Use `cm` with `kg`, or `in`
with `lb`, and preserve the user’s selected display system in your UI.

`prediction.prediction` contains minute/value points suitable for charting.
`impact` and chart bounds may be absent, so provide sensible presentation
fallbacks.
