# Food logs

Food-log operations require hydrated food and serving IDs.

```ts
const created = await january.foodLogs.create({
  name: 'Breakfast',
  timestampUTC: new Date().toISOString(),
  foods: [{
    id: food.id,
    serving: { id: serving.id!, quantity: 1 },
  }],
});
```

List logs for inclusive calendar dates (`YYYY-MM-DD`, at most 60 days) in the
client's timezone:

```ts
const logs = await january.foodLogs.list({
  start: '2026-09-01',
  end: '2026-09-07',
});
```

Summarize a range per day or week instead of paging through logs:

```ts
const summary = await january.foodLogs.getSummary({
  start: '2026-09-01',
  end: '2026-09-30',
  groupBy: 'week',
});
summary.buckets.forEach((week) =>
  console.log(week.startDate, week.logsCount, week.nutrients.calories?.value)
);
```

Update or delete a log:

```ts
await january.foodLogs.update({
  id: created.id!,
  name: 'Late breakfast',
});

await january.foodLogs.delete(created.id!);
```

An update must change at least one field; the SDK rejects an empty update
before sending it, and the API rejects unknown fields. Treat log IDs as
optional in response models and guard them before update or delete operations.

When January knows it, each logged food carries `servingDetails.weightGrams`,
the weight of one catalog serving; the grams eaten are
`consumedServing.quantity` times it.
