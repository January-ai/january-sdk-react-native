# API reference

## Foods

| Method | Request | Result |
| --- | --- | --- |
| `foods.autocomplete` | `AutocompleteFoodsRequest` | `AutocompleteFoodsResponse` |
| `foods.search` | `SearchFoodsRequest` | `FoodSearchResults` |
| `foods.get` | `GetFoodRequest` | `FoodSearchItem` |
| `foods.lookupBarcode` | `LookupFoodByBarcodeRequest` | `FoodSearchResults` |
| `foods.suggestAlternatives` | `SuggestFoodAlternativesRequest` | `SuggestFoodAlternativesResponse` |

## Restaurants

| Method | Request | Result |
| --- | --- | --- |
| `restaurants.search` | `SearchRestaurantsRequest` | `SearchRestaurantsResponse` |
| `restaurants.searchMenuItems` | `SearchRestaurantsRequest` | `SearchRestaurantMenuItemsResponse` |
| `restaurants.getMenuItems` | `GetRestaurantMenuItemsRequest` | `GetRestaurantMenuItemsResponse` |

## Meal analysis

| Method | Request | Result |
| --- | --- | --- |
| `foodAnalysis.analyzeDescription` | `AnalyzeDescriptionRequest` | `FoodScan` |
| `foodAnalysis.analyzePhoto` | `AnalyzePhotoRequest` | `FoodScan` |
| `foodAnalysis.correct` | `CorrectPhotoScanRequest` | `FoodScan` |

## User resources

| Method | Request | Result |
| --- | --- | --- |
| `foodLogs.create` | `CreateFoodLogRequest` | `FoodLog` |
| `foodLogs.list` | `ListFoodLogsRequest` | `FoodLogList` |
| `foodLogs.update` | `UpdateFoodLogRequest` | `FoodLog` |
| `foodLogs.delete` | log ID string | `void` |
| `glucose.predict` | `PredictGlucoseRequest` | `GlucosePrediction` |

All methods return promises and reject when local validation, authentication,
transport, or native SDK processing fails.
