# Authentication

The client authenticates with a token provider: an async function that gets a
client token from your [backend token endpoint](backend-token-endpoint.md).

## Token provider

Put the provider in its own module. The other samples import it as
`tokenProvider`.

```ts
import type { JanuaryTokenProvider } from '@januaryai/react-native';
import { getSessionToken } from './session'; // your app's session

const TOKEN_URL = 'https://api.example.com/january/client-token';

// The SDK retries a provider error only when it carries `retryable: true`.
const providerError = (message: string, retryable: boolean) =>
  Object.assign(new Error(message), { retryable });

export const tokenProvider: JanuaryTokenProvider = async (endUserId) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        // Read the session on every call, not once at startup.
        Authorization: `Bearer ${await getSessionToken()}`,
        // Only the token relay reads this header. Your production endpoint
        // takes the user from the session and ignores it.
        'January-End-User-ID': endUserId,
      },
      signal: controller.signal,
    });
  } catch {
    throw providerError('Token endpoint unreachable or timed out', true);
  } finally {
    clearTimeout(timer);
  }

  const { status } = response;
  if (!response.ok) {
    const retryable = status === 408 || status === 429 || status >= 500;
    throw providerError(`Token endpoint returned ${status}`, retryable);
  }

  // January's body has `expires_in`; this SDK reads `expiresIn`.
  const body = await response.json().catch(() => ({}));
  const expiresIn = body.expiresIn ?? body.expires_in;
  if (typeof body.token !== 'string' || typeof expiresIn !== 'number') {
    throw providerError('Token endpoint returned an unreadable body', false);
  }
  return { token: body.token, expiresIn };
};
```

During development, point `TOKEN_URL` at the
[token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay).
Switching to your endpoint changes only the URL and the session credential.

## Create the client

```ts
import { JanuaryClient } from '@januaryai/react-native';
import { tokenProvider } from './januaryTokenProvider';

const january = new JanuaryClient({
  endUserId: user.id,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  clientTokenProvider: tokenProvider,
});
```

[User identity and timezone](../concepts/user-identity-and-timezone.md)
explains both options. Create the client where your app holds the signed-in
session, not at module scope; see [Client lifecycle](../concepts/client-lifecycle.md).

## Token refresh and retries

* The SDK keeps the token in memory until 60 seconds before it expires.
  Concurrent calls share one refresh.
* On `401 token_expired`, it gets a new token and replays the call once.
* A provider error with `retryable: true` is retried up to 8 more times,
  waiting 1, 2 and 4 seconds, then 8 seconds each time. A call can wait about
  47 seconds, plus the time the attempts take, before it fails.
* Any other provider error fails the call at once. It rejects with
  `client_token_provider_failed` on iOS or `authentication` on Android; see
  [Errors](../reference/errors.md).

## Development API key

In a debug build on your own machine, `developmentApiKey` can replace
`clientTokenProvider`. The two options are mutually exclusive.

```ts
const january = new JanuaryClient({
  endUserId: 'local-demo-user',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  developmentApiKey: process.env.EXPO_PUBLIC_JANUARY_API_KEY ?? '',
});
```

In this mode the SDK sends `endUserId` to January as the `January-End-User-ID`
header.

{% hint style="warning" %}
Expo copies `EXPO_PUBLIC_` values into the JavaScript bundle. Release builds
refuse this mode (`Development API-key authentication is available in debug
builds only.`), but keep the variable out of any build you distribute. See
[Keep the API key off the device](backend-token-endpoint.md#keep-the-api-key-off-the-device).
{% endhint %}

Next: [First request](quick-start.md).
