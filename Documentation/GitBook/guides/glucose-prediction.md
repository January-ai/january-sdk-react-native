# Glucose prediction

`glucose.predict` predicts the glucose curve for a meal from the foods eaten,
the time, and a user profile. It needs the `glucose:read` scope. Each food is a
`FoodSelection` from [Food details and portions](../concepts/food-hydration-and-portions.md),
and the client's timezone ([User identity and timezone](../concepts/user-identity-and-timezone.md))
is sent with the prediction.

{% hint style="warning" %}
Glucose predictions and profile inputs are health data. Keep request and
response values out of analytics, crash reports, and general-purpose logs.
{% endhint %}

```ts
const { prediction, impact, chart } = await january.glucose.predict({
  foods: [selection],
  startTime: new Date().toISOString(),
  userProfile: {
    age: 38,
    sex: 'female',
    height: { unit: 'in', value: feet * 12 + inches },
    weight: { unit: 'kg', value: 67 },
    activityLevel: 'moderately_active',
    healthConditions: [],
  },
});
```

* `age` is in whole years.
* Height (`in` or `cm`) and weight (`lb` or `kg`) units are independent. Show
  imperial height as feet plus inches, and send `feet * 12 + inches`.

| Result field | Meaning |
| --- | --- |
| `prediction` | The curve at 15-minute intervals: `minutes` after `startTime` and `value` in mg/dL |
| `impact` | `low`, `medium`, or `high`; may be absent |
| `chart.min`, `chart.max` | Suggested y-axis bounds in mg/dL, not the curve's lowest and highest values; may be absent |

{% hint style="info" %}
Predictions are informational. Don't present them as a diagnosis or as
treatment guidance.
{% endhint %}
