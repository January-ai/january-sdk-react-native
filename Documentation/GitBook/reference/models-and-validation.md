# Models and validation

All public request and response types are exported from
`@januaryai/react-native`. Import models with `import type` and use the exported
`FoodCategory` constant when a runtime category value is useful.

The TypeScript wrapper validates common input errors before crossing the native
bridge:

| Input | Validation |
| --- | --- |
| `endUserId` | Required and non-empty |
| Food query, food ID, barcode, log ID | Required and non-empty |
| Search/autocomplete limit | Integer from 1 through 100 |
| Restaurant latitude | -90 through 90 |
| Restaurant longitude | -180 through 180 |
| Restaurant radius | 1 through 50,000 meters |
| Menu offset | Non-negative integer |
| Food selections | At least one item with food ID, serving ID, and quantity greater than zero |
| Glucose start time | Required and non-empty |
| Food log update | At least one of `foods`, `timestampUTC`, or `name` |
| Water amount, weight | Positive value with a unit of `fl_oz`/`ml`/`cup` or `lb`/`kg` |
| Water and weight ranges | `start` and `end` required and non-empty |

Response fields marked optional may legitimately be absent. Avoid non-null
assertions in production UI and provide fallbacks for names, images, nutrition,
servings, impact levels, and response IDs.

## Units

| Type | Values |
| --- | --- |
| `VolumeUnit` | `'fl_oz'` (fluid ounces), `'ml'` (millilitres), `'cup'` (a US cup of 8 fl oz) |
| `WeightUnit` | `'lb'` (pounds), `'kg'` (kilograms) |

A water amount is 1–811.5 `fl_oz`, 30–24000 `ml`, or 0.125–101.4 `cup`; a
weight is 10–1000 `lb` or 4.5–453.6 `kg`. The API enforces these ranges.
Responses may carry a unit newer than this SDK.
