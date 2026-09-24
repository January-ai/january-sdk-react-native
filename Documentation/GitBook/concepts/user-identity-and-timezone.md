# User identity and timezone

```ts
const january = new JanuaryClient({
  endUserId: user.id,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  clientTokenProvider: tokenProvider,
});
```

## End-user ID

`endUserId` is required. It is the stable, opaque
[end-user ID](https://docs.january.ai/docs/authentication) your backend binds into the client
token: your own account ID, never an email address or another value that can
change.

The token decides whose logs are read and written. The SDK passes `endUserId`
to your token provider, and sends it to January as the `January-End-User-ID`
header only in `developmentApiKey` mode.

## Timezone

Pass the device's IANA timezone, as above, unless you store one per user. It
sets the calendar days for food-log lists and summaries and for water and
weight lists, and it is sent with glucose predictions.
[Days and timezones](https://docs.january.ai/rest-api/api-overview#days-and-timezones) explains
how January groups logs into days.

If you omit it or pass an invalid name, the result depends on the platform:

| | Omitted | Invalid name |
| --- | --- | --- |
| iOS | The device timezone | `new JanuaryClient` throws `timezone must be a valid IANA identifier.` |
| Android | UTC | Accepted; calls that send it fail with `invalid_request` |

Build `YYYY-MM-DD` dates in the same timezone.
`new Date().toISOString().slice(0, 10)` is the UTC date, which in the Americas
is already tomorrow by the evening:

```ts
// The device's calendar date as YYYY-MM-DD.
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

## Log times

`timestampUTC` (food logs), `consumedAt` (water) and `measuredAt` (weight) are
the REST API's `created_at`: when the meal was eaten, the water drunk, or the
weight measured. Send ISO 8601 with an offset, or omit it to mean now.
Responses return it in UTC.
