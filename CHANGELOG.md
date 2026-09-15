# Changelog

All notable changes to the January SDK for React Native are documented here.
This project uses Semantic Versioning.

## [Unreleased]

- Support React Native 0.83 and later (peer range was 0.86+). Verified on a
  bare React Native 0.83.10 app with the New Architecture on Android.
- `yarn example android` now finds the Android SDK and a JDK 17–21 on its own,
  starts an emulator when no device is connected, and forwards ports 8081 and
  8787 into it, so `example/.env` is the same for iOS and Android.
- Example app: navigate with a native stack (`@react-navigation/native-stack`
  on `react-native-screens`). Food detail, restaurant detail and menu items,
  food-log detail, and the glucose conditions and result screens now push and
  pop with the platform transition and support the iOS swipe-back gesture.
- Pin the January Android SDK `0.1.2`, which reports client token provider
  failures as SDK errors instead of crashing the app when the token endpoint
  is unreachable.

## [0.1.0] - 2026-09-03

- Promote the React Native bridge and demo application to a stable release.
- Pin the stable January iOS `0.1.0` and Android `0.1.1` SDKs.
- Complete the native-demo parity flows for search, restaurants, scanning,
  food logs, glucose prediction, and metric/imperial profile controls.
- Run the complete deterministic Maestro suite on both iOS and Android in CI.

## [0.1.0-beta.1] - 2026-09-03

- Add the initial TypeScript API and React Native TurboModule.
- Bridge the January iOS and Android SDKs for food discovery, restaurants,
  photo analysis, food logs, and glucose prediction.
- Add client-token authentication and Debug-only API-key authentication.
- Add the Expo development-build demo application.
- Add cross-platform Maestro UI coverage and native-demo parity evidence.
