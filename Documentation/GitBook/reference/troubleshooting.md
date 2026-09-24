# Troubleshooting

## `@januaryai/react-native is not linked. Rebuild the native application after installing the package.`

`new JanuaryClient` throws this when the running binary lacks the native
module. A client created at module scope throws as soon as its file is
imported.

* React Native: run `npx pod-install`, then rebuild the app.
* Expo: run `npx expo prebuild --clean`, then rebuild the development build.
  Expo Go can't load the module.
* Jest: mock the package; see [Testing](testing.md).

Restarting Metro is not enough.

## `This JanuaryClient has been disposed.`

Something still uses a client after `dispose()`, usually after sign-out.
Create a new client for the next user. In React, a client created in `useMemo`
and disposed in an effect cleanup hits this under Strict Mode; use the hook in
[Client lifecycle](../concepts/client-lifecycle.md).

## `Development API-key authentication is available in debug builds only.`

`developmentApiKey` works only in debug builds. Release builds need
`clientTokenProvider`; see [Authentication](../getting-started/authentication.md).

## `timezone must be a valid IANA identifier.`

iOS rejects a `timezone` that isn't an IANA name. Pass a name such as
`America/New_York`; `Intl.DateTimeFormat().resolvedOptions().timeZone`
returns one. Android accepts an invalid name, and the calls that send it fail
with `invalid_request`.

## `Dependency 'ai.january:january-sdk-android:…' requires core library desugaring to be enabled`

Enable desugaring in `android/app/build.gradle` (React Native), or add the
`@januaryai/react-native` config plugin and run prebuild (Expo). See
[Installation](../getting-started/installation.md).

## `@januaryai/react-native: only Groovy android/app/build.gradle is supported.`

The Expo config plugin edits a Groovy `android/app/build.gradle`. If your app
module uses `build.gradle.kts`, remove the plugin and enable desugaring by
hand, as in the [Android steps](../getting-started/installation.md#android).

## Minting a token fails with `403 forbidden`

Client tokens are switched off for your account. Turn on **Enable client
tokens** in the [Developer Dashboard](https://dashboard.january.ai/dashboard/client-tokens).

## `scope_insufficient`

The client token lacks the scope the call needs. Add it to the scopes your
backend mints ([scope table](https://docs.january.ai/rest-api/authentication#client-token-scopes)).
The client keeps its current token until it expires, so create a new client
(or restart the app) to test the change at once.

## Every call fails with a token error

The code is `client_token_provider_failed`, `invalid_client_token`, or
`invalid_client_token_expiration` on iOS, and `authentication` on Android.

* The provider must return `{ token, expiresIn }`. January's body has
  `expires_in`; returned unmapped, `expiresIn` is missing and every call
  fails. Map it as the [Authentication](../getting-started/authentication.md)
  sample does.
* `expiresIn` must be more than 60 seconds.
* Check that the app's session reaches your endpoint and that the endpoint
  returns `201` with a `ct-…` token.

## iOS can't resolve `January`

Make sure CocoaPods can reach the public trunk, update your local specs if
needed, and run pod installation again. Don't add a second `January`
dependency yourself.

## Android can't resolve the native SDK

Make sure the project includes Maven Central and is online during dependency
resolution. Don't add another version of `ai.january:january-sdk-android`.
