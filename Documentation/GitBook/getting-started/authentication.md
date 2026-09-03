# Authentication

Create a `JanuaryClient` with a stable end-user ID and an asynchronous client
token provider:

```ts
import { JanuaryClient, type JanuaryTokenProvider } from '@januaryai/react-native';

const tokenProvider: JanuaryTokenProvider = async (endUserId) => {
  const response = await fetch('https://api.example.com/january/client-token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify({ endUserId }),
  });
  if (!response.ok) throw new Error('Unable to obtain a January client token');
  return response.json();
};

const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: 'America/New_York',
  clientTokenProvider: tokenProvider,
});
```

The native SDK caches and refreshes the token. The provider may be called again
when authentication expires. If a provider error is safe to retry, throw an
object or `Error` carrying `retryable: true`.

For local Debug builds only, `developmentApiKey` is available as a mutually
exclusive alternative to `clientTokenProvider`:

```ts
const january = new JanuaryClient({
  endUserId: 'local-demo-user',
  developmentApiKey: process.env.EXPO_PUBLIC_JANUARY_API_KEY!,
});
```

Never distribute a build containing a January server API key.
