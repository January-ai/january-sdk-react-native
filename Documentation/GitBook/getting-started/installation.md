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

Set `minSdkVersion` in the consuming application's existing
`android/build.gradle` configuration to 24 or higher. Keep its other
`buildscript` and `ext` settings unchanged. For example:

```groovy
// android/build.gradle
buildscript {
    ext {
        // ...keep the application's other ext values
        minSdkVersion = 24
    }
}
```

The January Android SDK uses `java.time`, which Android added in API 26. If
`minSdkVersion` is 24 or 25, enable core library desugaring in the app module;
the SDK's AAR metadata makes the build fail with a clear message if it is
missing, instead of crashing on API 24 and 25 devices:

```groovy
// android/app/build.gradle
android {
    compileOptions {
        coreLibraryDesugaringEnabled true
    }
}

dependencies {
    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
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

In the Expo application's existing `app.json` or `app.config.js`, merge the
plugin configuration below with the application's other settings. The
`@januaryai/react-native` plugin enables core library desugaring in the
generated Android project; it is required while `minSdkVersion` is below 26
and harmless otherwise:

```json
{
  "expo": {
    "plugins": [
      "@januaryai/react-native",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24
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
