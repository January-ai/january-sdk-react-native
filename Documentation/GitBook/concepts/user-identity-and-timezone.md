# User identity and timezone

`endUserId` is required and must be stable for the same person across app
sessions. It scopes user-specific operations such as food logs and glucose
prediction.

Use an opaque internal account identifier. Do not use an email address or other
mutable display value.

```ts
const january = new JanuaryClient({
  endUserId: account.id,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  clientTokenProvider: getJanuaryClientToken,
});
```

The timezone is optional but recommended. Supply an IANA timezone such as
`America/New_York`, not a fixed UTC offset. Create a new client if the active
user changes.
