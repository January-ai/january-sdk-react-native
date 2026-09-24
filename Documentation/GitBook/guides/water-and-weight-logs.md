# Water and weight logs

Water and weight logs belong to the client’s end user, like food logs. Dates
are inclusive calendar days (`YYYY-MM-DD`) in the client’s timezone, so a
request with the same `start` and `end` reads back exactly one day.

## Water

Log an amount in fluid ounces (`fl_oz`), milliliters (`ml`), or US cups of
8 fl oz (`cup`). An end user’s total is capped at 24 L (about 811 fl oz) per
day; a log that would pass it is rejected, and the error’s `code` is
`daily_water_limit_exceeded`.

```ts
const log = await january.waterLogs.create({
  amount: { value: 8, unit: 'fl_oz' },
  // Optional; omitted means now. Any ISO-8601 offset is accepted.
  consumedAt: new Date().toISOString(),
});
```

`create` is not idempotent: after a timed-out create, check the day’s total
before retrying, since a retry records the water twice and counts twice toward
the cap.

Read daily totals back in the unit you display (`fl_oz` when `unit` is
omitted), whichever units the logs were made in. Only days with water logged
are present, oldest first, and a total is rounded to one decimal place:

```ts
const { items } = await january.waterLogs.list({
  start: '2026-09-01',
  end: '2026-09-07',
  unit: 'cup',
});
items.forEach((day) => console.log(day.date, day.total.value, day.total.unit));
```

Keep the `id` from `create` to remove a log. Deleting an unknown or already
deleted log also succeeds, so a delete is safe to retry:

```ts
await january.waterLogs.delete(log.id);
```

## Weight

Log a measurement in pounds or kilograms. Every measurement is kept; listing
shows one weight per day, the latest measured, so logging again later the same
day replaces what that day shows. `create` is not idempotent either: a retried
create records the measurement twice, which listing then shows once.

```ts
await january.weightLogs.create({
  weight: { value: 150, unit: 'lb' },
  // Optional; omitted means now.
  measuredAt: new Date().toISOString(),
});

const { items } = await january.weightLogs.list({
  start: '2026-09-01',
  end: '2026-09-30',
});
items.forEach((day) => console.log(day.date, day.weight.value, day.weight.unit));
```

## Ranges and validation

`create` rejects a non-positive value or an unknown unit before the request is
sent. The API accepts 1–811.5 fl_oz, 30–24000 ml, or 0.1–101.4 cup of water
and 10–1000 lb or 4.5–453.6 kg of weight per log. A range whose `start` is more
than five years ago is refused with the code `date_range_too_large`; at most
100 days are returned, the most recent when more match.

Client tokens need the `water_logs:read`, `water_logs:write`,
`weight_logs:read`, and `weight_logs:write` scopes for these operations; the
[token relay](https://github.com/January-ai/january-token-relay) requests them
by default.
