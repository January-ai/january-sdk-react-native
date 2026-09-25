# Errors

A failed call rejects with an `Error` carrying `code` and `message`. Branch on
`code`; the message wording can change.

| `error.code` | Meaning |
| --- | --- |
| An API code, such as `not_found`, `scope_insufficient`, `date_range_too_large`, `daily_water_limit_exceeded`, or `rate_limited` | January returned an error; see [REST errors](https://docs.january.ai/rest-api/api-overview#errors) |
| `client_token_provider_failed` (iOS), `authentication` (Android) | Your token provider threw a non-retryable error, or its retries ran out ([Token refresh and retries](../getting-started/authentication.md#token-refresh-and-retries)) |
| `invalid_client_token`, `invalid_client_token_expiration` (iOS), `authentication` (Android) | The provider returned an empty token, or one that expires within 60 seconds |
| `transport`, `timeout`, `decoding` | A network failure, a timeout, or a response the SDK couldn't read |
| `bridge_error` | The native client isn't configured, or the native layer rejected an argument |
| `january_error` | Any other native failure |
| none | The TypeScript wrapper rejected the input before sending it (the message names the field), or the client was disposed |

When January's response carries no code, `error.code` is the native error
category instead. Most match across platforms (`validation`, `authentication`,
`authorization`, `server`), but not-found and rate-limit errors are `notFound`
and `rateLimited` on iOS and `not_found` and `rate_limited` on Android.

The constructor throws instead of rejecting: `new JanuaryClient` fails
synchronously when the module isn't linked, the timezone is invalid (iOS), or
`developmentApiKey` is used in a release build. See
[Troubleshooting](troubleshooting.md) for each message.

## Retries

Besides the token-provider retries, the SDK retries only one thing: after
`401 token_expired` it gets a new token and replays the call once. Retry
`rate_limited` and `5xx` codes yourself, with backoff; the rejection doesn't
include `Retry-After`. Never retry `request_limit_exceeded` or
`credit_limit_exceeded` before your billing period resets. Before you retry a create
that timed out, check whether it was recorded
([food logs](../guides/food-logs.md#create),
[water and weight logs](../guides/water-and-weight-logs.md#water)).

## Example

```ts
function messageFor(error: unknown): string {
  const { code, message } = error as { code?: string; message?: string };
  switch (code) {
    case 'rate_limited':
    case 'service_unavailable':
    case 'transport':
    case 'timeout':
      return 'January is busy or unreachable. Try again in a moment.';
    case 'client_token_provider_failed': // iOS
    case 'authentication': // Android
      return 'Could not get a January token. Check your connection and sign-in.';
    case 'scope_insufficient':
      return 'This feature is not enabled for your account.';
    default:
      return message ?? 'Something went wrong.';
  }
}

try {
  await january.foods.search({ query: 'greek yogurt' });
} catch (error) {
  showMessage(messageFor(error));
}
```

Voice capture has its own error type, `VoiceCaptureError`; see
[Voice capture](../guides/voice-capture.md#snapshots-results-and-errors).
