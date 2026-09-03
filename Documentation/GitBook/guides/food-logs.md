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

List logs in an ISO-8601 time range:

```ts
const logs = await january.foodLogs.list({
  start: '2026-09-01T00:00:00Z',
  end: '2026-09-08T00:00:00Z',
});
```

Update or delete a log:

```ts
await january.foodLogs.update({
  id: created.id!,
  name: 'Late breakfast',
});

await january.foodLogs.delete(created.id!);
```

Treat log IDs as optional in response models and guard them before update or
delete operations.
