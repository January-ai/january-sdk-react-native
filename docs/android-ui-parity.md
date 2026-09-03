# Android demo UI parity inventory

The Android demo is the visual and behavioral specification for the React Native
demo on Android. Reference implementation:

`../partner-sdk-android/demo/src/main/java/ai/january/partner/demo/`

Reference screenshots:

`../partner-sdk-android/qa/parity/evidence/2026-08-31/screenshots/`

## Acceptance gate

A row is complete only when the React Native demo:

1. reaches the state through the same visible user flow;
2. matches the Android reference at the same Pixel 10a viewport;
3. uses the same copy, ordering, spacing, colors, typography, controls, icons,
   sheet/dialog geometry, loading, empty, error, and disabled states;
4. remains usable with the software keyboard and system insets visible;
5. has a deterministic Maestro flow and a React Native screenshot;
6. passes screenshot comparison against the Android reference without a
   visible unexplained difference.

`Missing` means the React Native demo has no equivalent screen. `Partial` means
the flow exists but does not yet meet the acceptance gate. No current screen is
marked complete.

## App shell and setup

| Surface                  | Android evidence                 | RN status | Required parity                                                                |
| ------------------------ | -------------------------------- | --------- | ------------------------------------------------------------------------------ |
| Setup                    | Source: `DemoSetupScreen.kt`     | Partial   | Setup copy, credential guidance, fields, actions, and disabled states          |
| Development-auth warning | Source: `JanuaryDemoApp.kt`      | Partial   | Gold status-bar-safe warning banner and exact copy                             |
| Bottom navigation        | Present in every root screenshot | Partial   | Four destinations, icons, labels, selected state, dimensions, and insets       |
| Settings                 | `android-settings.png`           | Partial   | Full modal sheet, handle/header, fields, diagnostics, actions, keyboard/insets |

## Search, food discovery, and food detail

| State                | Android evidence                   | RN status |
| -------------------- | ---------------------------------- | --------- |
| Search initial       | `android-search-initial.png`       | Partial   |
| Search keyboard      | `android-search-keyboard.png`      | Partial   |
| Search loading       | `android-search-loading.png`       | Partial   |
| Search results       | `android-search-results.png`       | Partial   |
| Search empty         | `android-search-empty.png`         | Partial   |
| Search generic error | `android-search-error.png`         | Partial   |
| Search 401           | `android-search-error-401.png`     | Partial   |
| Search 403           | `android-search-error-403.png`     | Partial   |
| Search 404           | `android-search-error-404.png`     | Partial   |
| Search 422           | `android-search-error-422.png`     | Partial   |
| Search 429           | `android-search-error-429.png`     | Partial   |
| Search 504           | `android-search-error-504.png`     | Partial   |
| Food detail          | `android-food-detail.png`          | Partial   |
| Serving controls     | `android-serving.png`              | Partial   |
| Food nutrition       | `android-food-nutrition.png`       | Partial   |
| Food glucose loading | `android-food-glucose-loading.png` | Partial   |
| Food glucose error   | `android-food-glucose-error.png`   | Partial   |
| Food glucose result  | `android-food-glucose-result.png`  | Partial   |
| Alternatives initial | `android-alternatives-initial.png` | Partial   |
| Alternatives loading | `android-alternatives-loading.png` | Partial   |
| Alternatives error   | `android-alternatives-error.png`   | Partial   |
| Alternatives empty   | `android-alternatives-empty.png`   | Partial   |
| Alternatives results | `android-alternatives-results.png` | Partial   |

Additional source-defined states to capture: autocomplete suggestions; Foods /
Restaurants scope switch; Name / Description / Barcode modes; General / Branded /
Recipe category chips; description results; barcode entry; barcode scanner success,
cancel, and failure; food hydration failure; result-limit menu; technical-details
disclosures.

## Restaurants and menus

| State               | Android evidence                  | RN status |
| ------------------- | --------------------------------- | --------- |
| Restaurants initial | `android-restaurants-initial.png` | Partial   |
| Restaurants loading | `android-restaurants-loading.png` | Partial   |
| Restaurants error   | `android-restaurants-error.png`   | Partial   |
| Restaurants empty   | `android-restaurants-empty.png`   | Partial   |
| Restaurant filters  | `android-restaurant-filters.png`  | Partial   |
| Restaurant detail   | `android-restaurant-detail.png`   | Partial   |
| Menu loading        | `android-menu-loading.png`        | Partial   |
| Menu error          | `android-menu-error.png`          | Partial   |
| Menu empty          | `android-menu-empty.png`          | Partial   |
| Menu item detail    | `android-menu-detail.png`         | Partial   |

Additional source-defined states to capture: Restaurants / Menu items switch;
preset-city menu; current-location permission granted, denied, and unavailable;
radius slider; maximum-results stepper; location settings action; menu serving
controls; menu glucose sheet; restaurant/menu technical details.

## Meal scan and correction

| State              | Android evidence                 | RN status |
| ------------------ | -------------------------------- | --------- |
| Scan initial       | `android-scan-initial.png`       | Partial   |
| Image URL sheet    | `android-image-url.png`          | Partial   |
| Scan preview       | `android-scan-preview.png`       | Partial   |
| Scan loading       | `android-scan-loading.png`       | Partial   |
| Scan error         | `android-scan-error.png`         | Partial   |
| Scan result        | `android-scan-result.png`        | Partial   |
| Correction initial | `android-correction-initial.png` | Partial   |
| Correction loading | `android-correction-loading.png` | Partial   |
| Correction error   | `android-correction-error.png`   | Partial   |
| Correction result  | `android-correction-result.png`  | Partial   |

Additional source-defined states to capture: native photo picker; January camera
scanner in photo and barcode modes; camera permission handling; scanner cancel;
scanner photo result; barcode result sheet; change/remove photo; sample-photo
failure; URL validation; scan-another-meal action; per-detection and technical
detail disclosures.

## Food Logs

| State               | Android evidence                      | RN status |
| ------------------- | ------------------------------------- | --------- |
| Logs initial        | `android-logs-initial.png`            | Partial   |
| Logs loading        | `android-logs-loading.png`            | Partial   |
| Logs error          | `android-logs-error.png`              | Partial   |
| Logs empty          | `android-logs-empty.png`              | Partial   |
| Logs results        | `android-logs-results.png`            | Partial   |
| New log             | `android-log-new.png`                 | Partial   |
| Save loading        | `android-log-save-loading.png`        | Partial   |
| Save error          | `android-log-save-error.png`          | Partial   |
| Log detail          | `android-log-detail.png`              | Partial   |
| Edit log            | `android-log-edit.png`                | Partial   |
| Delete confirmation | `android-log-delete-confirmation.png` | Partial   |
| Delete error        | `android-log-delete-error.png`        | Partial   |
| Delete result       | `android-log-delete-result.png`       | Partial   |

Additional source-defined states to capture: time-span selection; start/end date
and time system pickers; meal-type menu; food picker from the editor; populated
editor food rows; quantity/serving edits; validation and disabled save; dismiss
with unsaved input; details disclosure.

## Glucose prediction

| State               | Android evidence                  | RN status |
| ------------------- | --------------------------------- | --------- |
| Prediction profile  | `android-glucose-profile.png`     | Partial   |
| Health conditions   | `android-conditions.png`          | Partial   |
| Food picker initial | `android-food-picker-initial.png` | Partial   |
| Prediction loading  | `android-glucose-loading.png`     | Partial   |
| Prediction error    | `android-glucose-error.png`       | Partial   |
| Prediction result   | `android-glucose-result.png`      | Partial   |

Required profile states: age; Female/Male switch; height `ft + in`/`cm` switch
with value conversion; weight `lb`/`kg` switch with value conversion; Type 2
diabetes and Prediabetes multi-select; meal date and time pickers; empty and
populated meal; selected-food serving and quantity controls; remove food;
disabled/enabled prediction action.

Required food-picker states: initial; keyboard; autocomplete; loading; error and
retry; empty; results; food hydration loading/error; choose-serving sheet;
serving menu; quantity controls; add-to-meal action. The bottom sheet must resize
or pan correctly so the keyboard never covers the search field or active result.

Required result states: navigation header; likely-peak summary; chart, target
band, axes, markers and legend; per-food impact; Worth knowing card; disclaimer;
Adjust meal and Start over actions.

## Delivery order

1. Glucose prediction and shared food picker.
2. Search, food detail, serving, nutrition, glucose impact, and alternatives.
3. Restaurants, filters, restaurant detail, and menu detail.
4. Scan, camera/barcode scanner, result, and correction.
5. Food Logs list, editor, detail, and deletion.
6. Setup, settings, app shell, and final cross-screen regression.

## Current React Native evidence

The food-discovery checkpoint is exercised on the Pixel 10a reference viewport
by the following deterministic flows:

- `18-search-food-parity.yaml`: search, food detail, nutrition, food glucose,
  and alternatives main states.
- `22-search-modes-parity.yaml`: name autocomplete, description analysis, and
  manual barcode lookup.
- `23-food-detail-recovery.yaml`: glucose and alternatives error/retry paths.
- `24-alternatives-empty.yaml`: no-suitable-alternatives state.
- `25-search-http-errors.yaml`: categorized 401, 403, 404, 422, 429, and 504
  states, including technical-details disclosure.

These flows provide implementation and screenshot evidence; their inventory
rows remain `Partial` until the final image-diff gate is met. Native camera
barcode scanning and food-detail serving-menu interaction remain outstanding.

The Food Logs and Settings checkpoint is exercised by:

- `02-settings.yaml`: the Android-height Settings sheet over the Glucose tab.
- `13-food-log-load-states.yaml`: loading, empty, error, and retry states.
- `14-food-log-crud-recovery.yaml`: new/edit, save loading/error/retry, and
  delete confirmation/error/result while preserving entered state.
- `21-food-logs-parity.yaml`: initial, results, detail, and edit surfaces.

All thirteen named Food Logs reference states now have deterministic React
Native screenshots. Their inventory rows remain `Partial` until automated
image-diff thresholds are defined and passed; the Android-native alert styling
is also still visibly different from the Compose delete dialog.
