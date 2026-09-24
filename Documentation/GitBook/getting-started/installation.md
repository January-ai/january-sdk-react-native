# Installation

Check the [requirements](../README.md#requirements) first, then install the
package with `npm install @januaryai/react-native` or
`yarn add @januaryai/react-native` and follow the React Native or the Expo
steps below.

The package brings the January iOS and Android SDK versions it was tested with
([pinned versions](../reference/platform-and-security.md#pinned-native-versions)).
Don't add `January` or `ai.january:january-sdk-android` to your app yourself.

## React Native

### iOS

```sh
npx pod-install
npx react-native run-ios
```

### Android

Enable core library desugaring in `android/app/build.gradle`. The January
Android SDK uses `java.time`, and every app that depends on it must enable
desugaring, whatever its `minSdkVersion`:

```groovy
android {
    compileOptions {
        coreLibraryDesugaringEnabled true
    }
}

dependencies {
    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
}
```

Then rebuild:

```sh
npx react-native run-android
```

React Native 0.83 projects set `minSdkVersion = 24` in `android/build.gradle`,
the SDK's minimum; if yours is lower, raise it to 24. Build with JDK 17–21.

## Expo

The SDK has native code, so it runs in a development build (Expo SDK 55 or
later), not in Expo Go.

1. Install the package:

   ```sh
   npx expo install @januaryai/react-native
   ```

2. Add `"@januaryai/react-native"` to `expo.plugins` in `app.json`. The plugin
   enables core library desugaring, which every Android build needs.

   ```json
   { "expo": { "plugins": ["@januaryai/react-native"] } }
   ```

3. Regenerate the native projects and build:

   ```sh
   npx expo prebuild --clean
   npx expo run:ios    # or: npx expo run:android
   ```

Config plugins run only during prebuild. If you commit `ios/` and `android/`
and don't run prebuild, follow the [React Native](#react-native) steps instead.
Expo SDK 55 sets `minSdkVersion` to 24 by default; don't lower it with
`expo-build-properties`.

Rebuild the development build whenever you install or upgrade the SDK.

## Confirm linking

```ts
import { getNativeModuleVersion } from '@januaryai/react-native';

console.log(getNativeModuleVersion()); // "0.3.0" when linked, null when not
```

`null` means the running binary lacks the native module. Run `npx pod-install`
(React Native) or `npx expo prebuild --clean` (Expo), then rebuild the app.
Restarting Metro is not enough.

Next: [Backend token endpoint](backend-token-endpoint.md).
