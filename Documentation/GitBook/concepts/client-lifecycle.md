# Client lifecycle

Create one `JanuaryClient` for the active signed-in user and reuse it across
screens. Each client owns a native client instance and, in production, a token
request subscription.

```ts
const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: session.timezone,
  clientTokenProvider: getJanuaryClientToken,
});
```

Call `dispose()` when the user signs out or the application permanently replaces
the client:

```ts
january.dispose();
```

Calls made after disposal throw an error. Do not construct a new client for
every request or render. In React, keep it in session-level state or a context
provider and dispose it in that owner’s cleanup path.
