# iOS demo UI parity inventory

The native iOS demo is the visual and behavioral specification for the React
Native demo on iOS.

- Source: `../partner-sdk-ios/Examples/JanuaryPartnerDemo/JanuaryPartnerDemo/`
- Reference images: `../partner-sdk-android/qa/parity/evidence/2026-08-31/screenshots/ios-*.png`
- Reference viewport: iPhone Air, 1260 × 2736 screenshot pixels

## Acceptance gate

A state is complete only when the React Native demo reaches it through the same
visible flow, has deterministic UI automation, and matches the native reference
for copy, order, typography, spacing, colors, icons, sheets, system controls,
safe-area behavior, keyboard behavior, and loading/error/disabled states. Every
state remains `Partial` until a React Native screenshot has passed visual review
against its iOS reference.

## Mirrored component system

React Native components deliberately follow the native iOS component boundary,
so screens compose shared primitives rather than carrying private approximations.

| Native iOS component         | React Native component                  | Current use/status                           |
| ---------------------------- | --------------------------------------- | -------------------------------------------- |
| `CardStyle.swift`            | `designSystem/AppCard.tsx`              | Shared by restaurant menu detail             |
| `EmptyStateCard.swift`       | `designSystem/EmptyStateCard.tsx`       | Shared by Food Logs and Restaurants          |
| `MacroGrid.swift`            | `designSystem/MacroGrid.tsx`            | Shared by Food Logs and menu detail          |
| `NutritionList.swift`        | `designSystem/NutritionList.tsx`        | Shared by Food Logs and menu detail          |
| `SectionLabel.swift`         | `designSystem/SectionLabel.tsx`         | Shared by Logs, Glucose, Scan, Restaurants   |
| `SegmentedControl.swift`     | `designSystem/SegmentedControl.tsx`     | Shared by Glucose profile units and sex      |
| `WorkflowGuideCard.swift`    | `designSystem/WorkflowGuideCard.tsx`    | Shared by Glucose and Food Logs              |
| `PrimaryButton.swift`        | Existing `sharedStyles.primaryButton`   | Needs component extraction                   |
| `SecondaryButtonStyle.swift` | Existing `sharedStyles.secondaryButton` | Needs component extraction                   |
| `ErrorNotice.swift`          | Screen-local notices                    | Needs component extraction and error mapping |
| `FoodRow.swift`              | Screen-local rows                       | Needs component extraction                   |
| `LoadingSpinner.swift`       | `ActivityIndicator` usages              | Needs component extraction                   |
| `PredictionChart.swift`      | Glucose result chart                    | Present; visual comparison pending           |
| `ScreenShell.swift`          | Root screen wrappers                    | Present; component extraction pending        |
| `AppNavigationBar.swift`     | Root bottom navigation                  | Present; visual comparison pending           |
| `AppNavigationButton.swift`  | Header icon buttons                     | Present; component extraction pending        |
| `SearchField.swift`          | Screen-local search fields              | Needs component extraction                   |

## Screen and state inventory

| Area        | State                                | iOS evidence                      | RN status |
| ----------- | ------------------------------------ | --------------------------------- | --------- |
| Shell       | Setup                                | `ios-setup.png`                   | Partial   |
| Shell       | Settings                             | `ios-settings.png`                | Partial   |
| Search      | Initial                              | `ios-search-initial.png`          | Partial   |
| Search      | Keyboard                             | `ios-search-keyboard.png`         | Partial   |
| Search      | Loading                              | `ios-search-loading.png`          | Partial   |
| Search      | Results                              | `ios-search-results.png`          | Partial   |
| Search      | Empty                                | `ios-search-empty.png`            | Partial   |
| Search      | Generic error                        | `ios-search-error.png`            | Partial   |
| Search      | HTTP 401                             | `ios-search-error-401.png`        | Partial   |
| Search      | HTTP 403                             | `ios-search-error-403.png`        | Partial   |
| Search      | HTTP 404                             | `ios-search-error-404.png`        | Partial   |
| Search      | HTTP 422                             | `ios-search-error-422.png`        | Partial   |
| Search      | HTTP 429                             | `ios-search-error-429.png`        | Partial   |
| Food        | Detail                               | `ios-food-detail.png`             | Partial   |
| Food        | Serving controls                     | `ios-serving.png`                 | Partial   |
| Food        | Nutrition                            | `ios-food-nutrition.png`          | Partial   |
| Food        | Glucose loading                      | `ios-food-glucose-loading.png`    | Partial   |
| Food        | Glucose error                        | `ios-food-glucose-error.png`      | Partial   |
| Food        | Glucose result                       | `ios-food-glucose-result.png`     | Partial   |
| Food        | Alternatives initial                 | `ios-alternatives-initial.png`    | Partial   |
| Restaurants | Initial                              | `ios-restaurants-initial.png`     | Partial   |
| Restaurants | Loading                              | `ios-restaurants-loading.png`     | Partial   |
| Restaurants | Error                                | `ios-restaurants-error.png`       | Partial   |
| Restaurants | Empty                                | `ios-restaurants-empty.png`       | Partial   |
| Restaurants | Filters                              | `ios-restaurant-filters.png`      | Partial   |
| Restaurants | Detail                               | `ios-restaurant-detail.png`       | Partial   |
| Menu        | Loading                              | `ios-menu-loading.png`            | Partial   |
| Menu        | Error                                | `ios-menu-error.png`              | Partial   |
| Menu        | Empty                                | `ios-menu-empty.png`              | Partial   |
| Menu        | Item detail                          | `ios-menu-detail.png`             | Partial   |
| Scan        | Initial                              | `ios-scan-initial.png`            | Partial   |
| Scan        | Image URL                            | `ios-image-url.png`               | Partial   |
| Scan        | Preview                              | `ios-scan-preview.png`            | Partial   |
| Scan        | Loading                              | `ios-scan-loading.png`            | Partial   |
| Scan        | Error                                | `ios-scan-error.png`              | Partial   |
| Scan        | Result                               | `ios-scan-result.png`             | Partial   |
| Correction  | Initial                              | `ios-correction-initial.png`      | Partial   |
| Correction  | Loading                              | `ios-correction-loading.png`      | Partial   |
| Correction  | Error                                | `ios-correction-error.png`        | Partial   |
| Correction  | Result                               | `ios-correction-result.png`       | Partial   |
| Food Logs   | Initial                              | `ios-logs-initial.png`            | Partial   |
| Food Logs   | Loading                              | `ios-logs-loading.png`            | Partial   |
| Food Logs   | Error                                | `ios-logs-error.png`              | Partial   |
| Food Logs   | Empty                                | `ios-logs-empty.png`              | Partial   |
| Food Logs   | Results                              | `ios-logs-results.png`            | Partial   |
| Food Logs   | New log                              | `ios-log-new.png`                 | Partial   |
| Food Logs   | Save loading                         | `ios-log-save-loading.png`        | Partial   |
| Food Logs   | Save error                           | `ios-log-save-error.png`          | Partial   |
| Food Logs   | Detail                               | `ios-log-detail.png`              | Partial   |
| Food Logs   | Edit                                 | `ios-log-edit.png`                | Partial   |
| Food Logs   | Delete confirmation                  | `ios-log-delete-confirmation.png` | Partial   |
| Glucose     | Profile and metric/imperial controls | `ios-glucose-profile.png`         | Partial   |
| Glucose     | Conditions                           | `ios-conditions.png`              | Partial   |
| Glucose     | Food picker                          | `ios-food-picker-initial.png`     | Partial   |
| Glucose     | Loading                              | `ios-glucose-loading.png`         | Partial   |
| Glucose     | Error                                | `ios-glucose-error.png`           | Partial   |
| Glucose     | Result                               | `ios-glucose-result.png`          | Partial   |

## Current iOS evidence

The Expo 57 toolchain needs two reproducible Yarn patches under Xcode 26: removal
of invalid `SWIFT_RETURNS_RETAINED` annotations in `expo-modules-jsi`, and Expo's
documented `WeakSendableBox` fix for the Swift 6 event-emitter diagnostic in
`expo-modules-core`. With those patches, the native iOS build succeeds and the
development client runs on the iPhone Air reference viewport.

Captured React Native evidence is under `qa/parity/evidence/2026-09-02/ios/`.
The Search, Food Logs, and Glucose initial surfaces were launched and inspected
on iOS. The metric-height control was also exercised manually and changes the
form to centimeters.

The existing Glucose Maestro flow was explicitly targeted at the iPhone Air. It
passes launch, tab navigation, the initial profile assertion, and the
imperial/metric height switch, then fails because Maestro considers the
offscreen weight control visible without scrolling the React Native `ScrollView`.
It consequently taps the clipped control and cannot find the `Kilograms` label.
The Android-targeted Glucose and Food Logs parity flows still pass after the
shared-component changes.

The inventory remains `Partial`: iOS needs a platform-specific scroll gesture in
the automation flow, screenshot coverage for all 57 states, and a pixel-diff
threshold.
