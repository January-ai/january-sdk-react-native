# Water and weight logs

Water logs need the `water_logs:write` scope to create and delete and
`water_logs:read` to list; weight logs need `weight_logs:write` and
`weight_logs:read`.

List dates are inclusive `YYYY-MM-DD` days in the client's timezone
([User identity and timezone](../concepts/user-identity-and-timezone.md)), so
the same `start` and `end` read back one day. A list returns at most 100 days,
the most recent when more match; move `end` back to read older days. A `start`
more than five years back rejects with `date_range_too_large`.

## Water

Log an amount in `fl_oz`, `ml`, or `cup` (a US cup of 8 fl oz). This helper
reports the daily cap and returns the new log, whose `id` you need to delete
it:

```ts
import type { VolumeUnit } from '@januaryai/react-native';

async function logWater(value: number, unit: VolumeUnit, consumedAt?: string) {
  try {
    return await january.waterLogs.create({ amount: { value, unit }, consumedAt });
  } catch (error) {
    if ((error as { code?: string }).code === 'daily_water_limit_exceeded') {
      showMessage('That would pass 24 L for the day.');
      return undefined;
    }
    throw error;
  }
}

const log = await logWater(8, 'fl_oz'); // consumedAt omitted: now
```

* **Past days.** To log for an earlier day, send local noon of that day, which
  stays on that day in the device's timezone:

  ```ts
  // Local noon on a YYYY-MM-DD day, as an ISO 8601 instant.
  function noonOn(day: string): string {
    const [year, month, date] = day.split('-').map(Number) as [number, number, number];
    return new Date(year, month - 1, date, 12).toISOString();
  }

  await logWater(250, 'ml', noonOn('2026-09-10'));
  ```

* **Daily cap.** An end user's water is capped at 24 L (about 811 fl oz) per
  UTC calendar day of `consumedAt`, whatever offset you send. Lists group days
  in the client's timezone, so near midnight a listed day's total can differ
  from what the cap counted.
* **Retries.** Creating is not idempotent. After a create that timed out, list
  the day before you retry; a retry records the water twice and counts it
  twice toward the cap.
* **Deletes.** Deleting is idempotent: an unknown or already deleted log also
  succeeds. A deleted amount no longer counts toward the cap.

  ```ts
  if (log) await january.waterLogs.delete(log.id);
  ```

A list returns one total per day that has water, oldest first, in the unit you
ask for (`fl_oz` by default) whatever units the logs used, rounded to one
decimal place:

```ts
const { items } = await january.waterLogs.list({
  start: '2026-09-01',
  end: '2026-09-07',
  unit: 'cup',
});
items.forEach((day) => console.log(day.date, day.total.value, day.total.unit));
```

## Weight

Log a measurement in `lb` or `kg`. Every measurement is kept, and a list shows
one weight per day: the one with the latest `measuredAt` that day. A
measurement backdated to earlier that day doesn't change what the day shows.
Weight logs
have no ID and can't be updated or deleted. Creating is not idempotent either:
a retried create records the measurement twice, which the list shows once.

```ts
await january.weightLogs.create({
  weight: { value: 150, unit: 'lb' },
  measuredAt: new Date().toISOString(), // optional; omitted means now
});

const { items } = await january.weightLogs.list({
  start: '2026-09-01',
  end: '2026-09-30',
});
items.forEach((day) => console.log(day.date, day.weight.value, day.weight.unit));
```

## Accepted values

| Log | Accepted per entry |
| --- | --- |
| Water | 1–811.5 `fl_oz`, 30–24,000 `ml`, or 0.1–101.4 `cup` |
| Weight | 10–1,000 `lb`, or 4.5–453.6 `kg` |

The SDK rejects a value that isn't positive, or an unknown unit, before
sending the request; January enforces the ranges. The minimums don't convert
exactly into one another, so send the unit the user entered.
