# Backend token endpoint

Production apps obtain short-lived January client tokens from a backend you
control. The January server credential stays on that backend and never enters
the mobile bundle.

```text
React Native app ── authenticated request ──▶ Partner backend
                                                  │
                                                  │ private token issuance
                                                  ▼
                                             January API
                                                  │
React Native app ◀──── { token, expiresIn } ──────┘
       │
       └──── Authorization: Bearer ct-… ──▶ January Partner API
```

Your endpoint should:

1. Authenticate the signed-in app user.
2. Derive the stable partner user ID on the server.
3. Request a January client token with the private server credential.
4. Return only `{ token, expiresIn }` to the app.

Example mobile-side request:

```ts
async function getJanuaryClientToken() {
  const response = await fetch('https://api.example.com/january/client-token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) throw new Error(`Token endpoint returned ${response.status}`);
  return response.json() as Promise<{ token: string; expiresIn: number }>;
}
```

Derive the stable end-user ID from the authenticated account on your backend;
do not accept an arbitrary user ID from the app.
