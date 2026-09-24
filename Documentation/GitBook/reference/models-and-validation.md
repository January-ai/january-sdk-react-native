# Models and validation

All public request and response types are exported from
`@januaryai/react-native`; import them with `import type`. Food categories are
plain strings (`'generic'`, `'branded'`, `'recipe'`).

The SDK checks these inputs before it sends a request. Most checks run in the
TypeScript wrapper and reject with an `Error` that has no `code`; the message
names the field ([Errors](errors.md)).

| Input | Validation |
| --- | --- |
| `endUserId` | Required and non-empty |
| Food query, food ID, barcode, log ID | Required and non-empty |
| Autocomplete limit | Integer from 1 through 20 (default 8) |
| Search limit | Integer from 1 through 50 (default 10) |
| Restaurant, menu-item, and menu limits | Integer from 1 through 100 |
| Restaurant latitude | -90 through 90 |
| Restaurant longitude | -180 through 180 |
| Restaurant radius | 1 through 50,000 meters |
| Menu offset | Non-negative integer |
| Food selections | At least one item with food ID, serving ID, and quantity greater than zero |
| Glucose start time | Required and non-empty |
| Food log update | At least one of `foods`, `timestampUTC`, or `name` |
| Water amount, weight | Positive value with a unit of `fl_oz`/`ml`/`cup` or `lb`/`kg` |
| Food, water, and weight log ranges | `start` and `end` required and non-empty |

Response fields marked optional may be absent. Avoid non-null assertions in
production UI, and provide fallbacks for names, images, nutrition, servings,
impact levels, and response IDs.

## Units

| Type | Values |
| --- | --- |
| `VolumeUnit` | `'fl_oz'` (fluid ounces), `'ml'` (milliliters), `'cup'` (a US cup of 8 fl oz) |
| `WeightUnit` | `'lb'` (pounds), `'kg'` (kilograms) |

January enforces a range per unit; see
[Accepted values](../guides/water-and-weight-logs.md#accepted-values).
Responses may carry a unit newer than this SDK.
