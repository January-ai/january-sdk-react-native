# Client lifecycle

Create one `JanuaryClient` per signed-in user and share it across screens.
Each client has its own native client and token cache and never changes user.
On sign-out or an account switch, dispose the client and create a new one. Do
the same if the user's timezone changes.

## In React

```ts
import { useEffect, useState } from 'react';
import { JanuaryClient } from '@januaryai/react-native';
import { tokenProvider } from './januaryTokenProvider';

/** The signed-in user's client; undefined while signed out. */
export function useJanuaryClient(userId: string | undefined) {
  const [client, setClient] = useState<JanuaryClient>();

  useEffect(() => {
    if (!userId) return;
    const next = new JanuaryClient({
      endUserId: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      clientTokenProvider: tokenProvider,
    });
    setClient(next);
    return () => {
      setClient(undefined);
      next.dispose();
    };
  }, [userId]);

  return client;
}
```

Call the hook once, in the component that owns the signed-in session, and pass
the client down through a context. It creates a client for each end-user ID
and disposes it when the ID changes or the component unmounts.

Don't create the client in `useMemo`. Strict Mode runs effect cleanups once in
development, which would dispose a client the next render still uses. Don't
create it at module scope either: the constructor throws when the native
module isn't linked ([Troubleshooting](../reference/troubleshooting.md)).

## Disposal

`dispose()` releases the native client and stops its token requests. After
that, every call rejects with `This JanuaryClient has been disposed.`. Calling
`dispose()` again does nothing.
