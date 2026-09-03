# January SDK for React Native

The official React Native SDK for January food discovery, restaurants, food
analysis, food logs, and glucose prediction.

The package exposes one TypeScript API and delegates platform work to January's
native Swift SDK on iOS and Kotlin SDK on Android through a React Native
TurboModule.

## Install

### React Native

```sh
npm install @januaryai/react-native
```

Or:

```sh
yarn add @januaryai/react-native
```

Install the iOS pods after adding the package:

```sh
npx pod-install
```

React Native autolinking discovers the January native module. CocoaPods then
installs the pinned January iOS SDK, and Gradle downloads the pinned January
Android SDK from Maven Central. Applications should not install either native
SDK separately.

### Expo

```sh
npx expo install @januaryai/react-native
npx expo run:ios
# or
npx expo run:android
```

The SDK contains custom native code and therefore requires an Expo development
build. It does not run inside the standard Expo Go application. After installing
or upgrading the SDK, rebuild the native development client.

## Requirements

- React Native 0.86 or later
- React 19.2 or later
- iOS 15 or later
- Android API 26 or later
- New Architecture enabled

## Quick start

Production applications obtain short-lived January client tokens from their own
authenticated backend. Never include a January server API key in a mobile
application.

```ts
import { JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: 'America/New_York',
  clientTokenProvider: async (endUserId) => {
    const response = await fetch('/api/january/client-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'x-end-user-id': endUserId,
      },
    });
    if (!response.ok) {
      throw new Error(`Token endpoint returned ${response.status}`);
    }
    return response.json();
  },
});

const results = await january.foods.search({ query: 'greek yogurt' });
```

## Documentation

The complete integration guide is in
[`Documentation/GitBook`](Documentation/GitBook/README.md), including native
installation, production authentication, feature guides, API reference,
testing, and troubleshooting.

Create one client for the signed-in user, reuse it, and call `dispose()` when
that user signs out. Token caching and refresh remain inside the native SDK.

For an uncommitted local Debug build only, the SDK also supports development
API-key authentication. Never publish or distribute an application containing a
January server API key.

## Repository layout

```text
src/                         Public TypeScript API and TurboModule specification
ios/                         Swift and Objective-C++ React Native bridge
android/                     Kotlin React Native bridge
JanuaryReactNative.podspec   iOS package and native SDK dependency metadata
example/                     Expo development-build demo application
Documentation/GitBook/       GitBook integration and API documentation
qa/                          Cross-platform UI parity evidence
example/.maestro/            Device UI test flows
```

The npm package contains `src`, compiled `lib`, both native bridges, and the
podspec. The demo and QA files remain development-only and are not shipped in
consumer applications.

## Develop this SDK

Requirements:

- Node.js 22
- Yarn 4 through Corepack
- Xcode and CocoaPods for iOS
- Android Studio and JDK 17 for Android

Install dependencies and build the package:

```sh
corepack yarn install
corepack yarn prepare
```

Run the checks:

```sh
corepack yarn lint
corepack yarn typecheck
corepack yarn test
```

Run the demo on an iOS simulator or Android emulator:

```sh
corepack yarn example ios
corepack yarn example android
```

For deterministic demo data, start Metro in fixture mode:

```sh
corepack yarn ui:start
```

Then run the Maestro device suite in another terminal:

```sh
corepack yarn ui:test
```

The default suite runs every deterministic fixture and native-demo parity flow.
Use `corepack yarn ui:test:fixtures` when you only need the shorter functional
fixture suite during development.

For live local testing, configure either a partner token endpoint or a Debug-only
API key. See [`example/.env.example`](example/.env.example) for the supported
environment variables.

The example uses the released native SDKs by default. To test unreleased native
changes from sibling repositories, publish Android to Maven Local and opt into
the local dependencies explicitly:

```sh
JANUARY_USE_MAVEN_LOCAL=1 corepack yarn example android
JANUARY_IOS_SDK_PATH=/absolute/path/to/january-sdk-ios corepack yarn example ios
```

## IDE workflow

Use VS Code or Cursor for TypeScript and React Native development. Use Xcode to
build, sign, and run iOS, and Android Studio to build and run Android.

Open the generated iOS workspace, not the Xcode project:

```sh
open example/ios/JanuarySDKDemo.xcworkspace
```

Keep Metro running while editing TypeScript to use Fast Refresh.

## Native SDK versions

Every React Native release pins native SDK versions that passed the complete
bridge, build, and demo test suite. The current native dependencies are:

- iOS: `January` `0.1.0`
- Android: `ai.january:january-sdk-android:0.1.1`

Native releases are updated through a tested React Native release rather than a
dynamic `latest` or repository branch dependency.

## Release

Maintainer instructions, registry ordering, and npm trusted-publishing setup are
documented in [`.github/RELEASING.md`](.github/RELEASING.md).

## License

Apache 2.0. See [LICENSE](LICENSE).
