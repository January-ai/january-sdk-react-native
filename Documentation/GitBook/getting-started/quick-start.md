# First request

This component creates a client, searches for a food, and shows the result. It
uses the `tokenProvider` from [Authentication](authentication.md).

```tsx
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { JanuaryClient } from '@januaryai/react-native';
import { tokenProvider } from './januaryTokenProvider';

export function FirstRequest({ userId }: { userId: string }) {
  const [status, setStatus] = useState('Searching…');

  useEffect(() => {
    const january = new JanuaryClient({
      endUserId: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      clientTokenProvider: tokenProvider,
    });
    january.foods
      .search({ query: 'greek yogurt', category: 'generic', limit: 10 })
      .then(
        (results) => setStatus(`Found ${results.totalCount} foods`),
        (error: { code?: string; message: string }) =>
          setStatus(`${error.code ?? 'error'}: ${error.message}`)
      );
    return () => january.dispose();
  }, [userId]);

  return <Text>{status}</Text>;
}
```

Render it with the signed-in user's end-user ID. Any count, even 0, means the
installation and authentication work. `scope_insufficient` means the token
lacks `foods:read`. Other codes are in [Errors](../reference/errors.md), and
[Troubleshooting](../reference/troubleshooting.md) covers the common setup
failures.

To log a food, the app needs a serving and a quantity as well; see
[Food details and portions](../concepts/food-hydration-and-portions.md).

Next: [Example app](example-app.md).
