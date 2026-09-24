# Changelog

All notable changes to the January SDK for React Native are documented here.
This project uses Semantic Versioning.

## [Unreleased]

- `foods.autocomplete` and `foods.search` check `limit` against the API's
  ranges, 1–20 and 1–50, before crossing the bridge. The native SDKs already
  refused larger values; the wrapper allowed up to 100.

## [0.3.0] - 2026-09-23

- Pin the January iOS SDK `0.3.1` and Android SDK `0.3.1`, which add water and
  weight logs and cups, and read and send the API's `created_at` log timestamps.
  Food, serving, alternative, and menu-item IDs are no longer optional, and
  photo analysis without a reasoning effort now uses the API's reasoning-based
  analyzer.
- Add `waterLogs` (`create`, `list`, `delete`) and `weightLogs` (`create`,
  `list`) with the `WaterAmount`, `Volume`, `WaterLog`, `DailyWaterTotal`,
  `Weight`, `WeightLog`, and `DailyWeight` models. Client tokens need the
  `water_logs:*` and `weight_logs:*` scopes for them.
- `VolumeUnit` includes `cup`, a US cup of 8 fl oz: log 0.1–101.4 cups at a
  time, or read daily water totals in cups.
- `foodLogs.update` rejects an update that changes nothing before sending it;
  the API now refuses empty patches and unknown fields.
- `ServingDetails.weightGrams` is documented as the weight of one catalog
  serving.
- The example gains a Tracking tab that shows one day at a time: the day’s
  food-log summary and meals, water total, and weight. The Food Logs tab is
  renamed Logs.
- The example's Tracking tab charts the last week, month, or year: weight as
  a line in the selected unit and water as daily (or, for a year, monthly)
  bars, reading a year in consecutive 90-day `list` requests.
- The example's client uses the device's IANA timezone, and "today" on the
  Tracking and Logs tabs is the device's calendar date instead of the UTC date,
  which in the Americas turned into tomorrow every evening.

## [0.2.1] - 2026-09-16

- The example app and the repository toolchain now run React Native 0.83.10
  (Expo SDK 55), the minimum the SDK supports, instead of 0.86.
- Pin the January Android SDK `0.2.2`: voice capture now waits two seconds of
  silence before ending a capture, so speech is no longer cut off between
  words.
- Lower the minimum Android version from API 26 to API 24 and pin the January
  Android SDK `0.2.1`. Every Android app must enable core library desugaring,
  whatever its `minSdkVersion`; Expo apps add the `@januaryai/react-native`
  config plugin, bare apps add two lines to `android/app/build.gradle` (see the
  installation guide).

## [0.2.0] - 2026-09-16

Breaking: the Partner API changed the shape of a detected food, and 0.1.0
fails to decode photo scans and description analyses with an unreadable
response error. Update to restore them.

- `DetectedFood` no longer has `servings`. It has `serving` (the selected
  catalog serving, a `ServingSummary`) and `quantity` (how many of that serving
  were eaten). `nutrients` are already scaled to `quantity`. `DetectedServing`
  is a deprecated alias of `ServingSummary`; its `selectedQuantity` moved to
  `DetectedFood.quantity`.
- Food alternatives are `AlternativeFood` values with `servings:
  ServingSummary[]`.
- Added `foodLogs.getSummary`: nutrients summed per day or week over a date
  range, with totals and a per-logged-day average (`FoodLogSummary`).
- Added `AnalyzePhotoRequest.reasoningEffort` (`'xhigh'`) to opt into the
  reasoning-based photo analyzer.
- Added `VoiceCaptureSession`: microphone capture and speech recognition
  through the platform recognizers (Apple Speech, Android `SpeechRecognizer`),
  with live level, duration, partial text on Android, and stable error codes. The example shows a microphone in the search field and the
  food picker.
- Pin the January iOS SDK `0.2.0` and Android SDK `0.2.0`, which carry the
  same changes; the Android pin also includes the 0.1.2 fix that reports client
  token provider failures as SDK errors instead of crashing the app when the
  token endpoint is unreachable.
- Support React Native 0.83 and later (peer range was 0.86+). Verified on a
  bare React Native 0.83.10 app with the New Architecture on Android.
- `yarn example android` now finds the Android SDK and a JDK 17–21 on its own,
  starts an emulator when no device is connected, and forwards ports 8081 and
  8787 into it, so `example/.env` is the same for iOS and Android.
- Example app: navigate with a native stack (`@react-navigation/native-stack`
  on `react-native-screens`). Food detail, restaurant detail and menu items,
  food-log detail, and the glucose conditions and result screens now push and
  pop with the platform transition and support the iOS swipe-back gesture.

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
