# Platform and security

The npm package provides a TypeScript API and a TurboModule bridge. Runtime API
calls are executed by the pinned January native SDK on each platform.

| Platform | Native dependency |
| --- | --- |
| iOS | `January` through CocoaPods |
| Android | `ai.january:january-sdk-android` through Maven Central |

Native versions are pinned per React Native release so one tested combination
is installed for consumers. Do not add separate native SDK dependencies unless
you are developing the bridge itself.

## Security rules

* Use a partner-controlled backend to issue short-lived client tokens.
* Never place a January server API key in production JavaScript, native source,
  environment files included in a build, or remote configuration delivered to
  the app.
* Authenticate users before issuing a client token.
* Bind the token’s end-user ID to the authenticated account on the backend.
* Dispose the client when the signed-in session ends.

Development API-key authentication exists only for local Debug testing.
