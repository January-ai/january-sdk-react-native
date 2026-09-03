# Installation

Install the package with the package manager used by your application:

```sh
npm install @januaryai/react-native
```

```sh
yarn add @januaryai/react-native
```

## iOS

Install pods and rebuild the native application:

```sh
npx pod-install
npx react-native run-ios
```

Autolinking discovers the React Native module. The package podspec installs the
pinned January iOS SDK, so the application should not add `January` separately.

## Android

Rebuild the Android application after installation:

```sh
npx react-native run-android
```

Autolinking adds the bridge and Gradle resolves the pinned January Android SDK
from Maven Central. The application should not declare the native SDK directly.

Set the consuming application's minimum Android SDK to 26:

```groovy
// android/build.gradle
buildscript {
    ext {
        minSdkVersion = 26
    }
}
```

Use JDK 17 for Android builds. Newer Java releases may not be compatible with
the React Native Gradle and native CMake toolchain.

## Expo

```sh
npx expo install @januaryai/react-native
npx expo install expo-build-properties
npx expo run:ios
# or
npx expo run:android
```

This package contains native code. Use an Expo development build and rebuild it
after installing or upgrading the SDK. The standard Expo Go app cannot load the
module.

Set Android's minimum SDK in the Expo application configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 26
          }
        }
      ]
    ]
  }
}
```

## Confirm linking

```ts
import { getNativeModuleVersion } from '@januaryai/react-native';

console.log(getNativeModuleVersion());
```

If this reports that the package is not linked, reinstall pods on iOS, clean the
native build, and rebuild the application rather than only restarting Metro.
