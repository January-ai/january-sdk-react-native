# Backend token endpoint

The app gets client tokens from an endpoint on your backend. That endpoint is
the same for every January SDK; build it as described in
[Your token endpoint](https://docs.january.ai/docs/authentication#your-token-endpoint).

{% hint style="info" %}
No backend yet? Run the [token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay)
and continue to [Authentication](authentication.md). Come back before launch.
{% endhint %}

What matters for React Native:

* **Response.** Return January's `201` body unchanged. The React Native SDK
  reads only `expiresIn` (seconds), not January's `expires_in`, so the token
  provider on the [Authentication](authentication.md) page maps the field. A
  token that expires within 60 seconds is rejected.
* **Scopes.** The app's `JanuaryClient` uses one token for every call, so mint
  it with the scopes of every feature the app uses. See the
  [scope table](https://docs.january.ai/rest-api/authentication#client-token-scopes).
* **Switch.** Minting fails with `403 forbidden` until **Enable client tokens**
  is on in the [Developer Dashboard](https://dashboard.january.ai/dashboard/client-tokens).

## Keep the API key off the device

Your API key (`sk-…`) stays on your backend. Never ship it in a build you
distribute, whether in:

* JavaScript or TypeScript source, or anything Metro bundles;
* an `EXPO_PUBLIC_` variable or a `.env` file (Expo copies `EXPO_PUBLIC_`
  values into the bundle);
* native source, `Info.plist`, `BuildConfig`, or Gradle properties;
* remote configuration delivered to the app.

`developmentApiKey` is for debug builds on your own machine only; see
[Development API key](authentication.md#development-api-key).

Next: [Authentication](authentication.md).
