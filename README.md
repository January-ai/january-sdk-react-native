# January SDK for React Native

Official React Native SDK for January food discovery, restaurants, food analysis,
food logs, and glucose prediction.

> **Controlled preview:** the package is private and is not published to npm.

## Status

The SDK is a native-first wrapper. Its TypeScript API calls January's existing
Swift SDK on iOS and Kotlin SDK on Android through a React Native TurboModule.
The current preview includes production-shaped client-token authentication,
food search, photo analysis and correction, Food Logs CRUD, and glucose
prediction. The demo exposes those capabilities through four functional tabs.

## Repository layout

```text
src/       React Native package and public TypeScript API
ios/       iOS Turbo Native Module implementation
android/   Android Turbo Native Module implementation
example/   Expo development-build demo application
```

The example app does not require January credentials to launch. Configure a
partner token endpoint to run a live food search; the app never contains a
January server API key.

## Native dependencies

- iOS: `January` `0.1.0-beta.2` through CocoaPods. The iOS SDK repository now
  contains podspecs for `January` and `JanuaryPartnerTransport`.
- Android: `ai.january:january-sdk-android:0.1.0` through Maven.

Until those artifacts are published, local development can use the sibling
native repositories. Publish the Android SDK to Maven Local and add the local
iOS pods to the generated example Podfile before building the example.

## Development

Requirements:

- Node.js 22
- Yarn 4 through Corepack
- Xcode for iOS builds
- Android Studio and JDK 17 for Android builds

Install dependencies and run the checks:

```sh
corepack yarn install
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn prepare
```

Run the native example:

```sh
corepack yarn example ios
corepack yarn example android
```

Configure live authentication for the demo:

```sh
export EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT="https://your-backend.example/client-token"
export EXPO_PUBLIC_DEMO_SESSION_TOKEN="your-existing-app-session"
export EXPO_PUBLIC_DEMO_END_USER_ID="your-test-user-id"
```

## Authentication

Production applications must obtain short-lived client tokens from their own
authenticated backend. Never bundle a January server API key in a mobile app.

For an uncommitted local debug build only, the demo can use the development
initializer already provided by the native SDKs:

```sh
EXPO_PUBLIC_JANUARY_API_KEY="sk-..." corepack yarn example android
```

The native bridges reject development API-key authentication in non-debug
applications. Never publish or distribute a build containing this value.

## Device UI tests

The demo has a cross-platform Maestro suite for launch, navigation, settings,
food search, category selection, meal scanning and correction, Food Logs,
glucose prediction, empty states, and errors. Install an Android or iOS
development build and start the deterministic fixture bundle:

```sh
corepack yarn ui:start
```

In a second terminal, run:

```sh
corepack yarn ui:test
```

The optional live flow calls the native January SDK. Start Metro with
`EXPO_PUBLIC_JANUARY_API_KEY` instead of fixture mode, then run:

```sh
corepack yarn ui:test:live
```

```ts
import { JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: 'America/New_York',
  clientTokenProvider: async (endUserId) => {
    const response = await fetch('/api/january/client-token', {
      method: 'POST',
      headers: { 'x-end-user-id': endUserId },
    });
    return response.json();
  },
});

const result = await january.foods.search({ query: 'greek yogurt' });
```

Create one client for the signed-in user, reuse it, and call `dispose()` when
that user signs out. Token caching and refresh remain inside the native SDK.

## License

Apache 2.0. See [LICENSE](LICENSE).
