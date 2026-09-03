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

Response fields marked optional may legitimately be absent. Avoid non-null
assertions in production UI and provide fallbacks for names, images, nutrition,
servings, impact levels, and response IDs.
