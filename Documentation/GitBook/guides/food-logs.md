# Food logs

Food logs need the `food_logs:write` scope to create, update, and delete, and
`food_logs:read` to list and summarize. Each entry in `foods` is a
`FoodSelection` from [Food details and portions](../concepts/food-hydration-and-portions.md)
or from a [food analysis](meal-analysis.md#log-a-detection).

## Create

```ts
const created = await january.foodLogs.create({
  name: 'Breakfast',
  timestampUTC: new Date().toISOString(), // optional; omitted means now
  foods: [selection],
});
```

Creating is not idempotent. After a create that timed out, list the day
before you retry, or the meal may be logged twice.

## List and summarize

Dates are inclusive `YYYY-MM-DD` days in the client's timezone; see
[User identity and timezone](../concepts/user-identity-and-timezone.md). A list
spans at most 60 days:

```ts
const { items } = await january.foodLogs.list({ start: '2026-09-01', end: '2026-09-07' });
```

A summary adds up nutrients per day or per week over at most 366 days. Weeks
start on Monday unless you pass `weekStart: 'sunday'`:

```ts
const summary = await january.foodLogs.getSummary({
  start: '2026-09-01',
  end: '2026-09-30',
  groupBy: 'week',
  weekStart: 'sunday',
});
summary.buckets.forEach((week) =>
  console.log(week.startDate, week.logsCount, week.nutrients.calories?.value)
);
```

A longer range rejects with `date_range_too_large`.

## Update and delete

A log's `id` is optional in the TypeScript types, and a listed log rarely has
none, so guard it:

```ts
if (created.id) {
  await january.foodLogs.update({ id: created.id, name: 'Late breakfast' });
  await january.foodLogs.delete(created.id);
}
```

An update must change at least one of `foods`, `timestampUTC`, or `name`; the
SDK rejects an empty update before sending it. Deleting is idempotent: an
unknown or already deleted ID also succeeds.

The React Native SDK has no `foodLogs.get`. To read one log, list its day.

## Grams eaten

When January knows it, each logged food carries `servingDetails.weightGrams`,
the weight of one catalog serving. The grams eaten are
`consumedServing.quantity` times that weight.
