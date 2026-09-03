# January SDK for React Native

Build food discovery, restaurant search, meal analysis, food logging, and
glucose-prediction experiences from one typed TypeScript API. The package uses
January's native Swift SDK on iOS and Kotlin SDK on Android through a React
Native TurboModule.

## What you can build

* Food autocomplete, search, barcode lookup, hydration, and alternatives
* Nearby restaurant and menu-item discovery
* Meal analysis from a description, image URL, or base64 data URI
* Food-log creation, listing, updates, and deletion
* Personalized glucose-impact predictions

## Requirements

| Component | Requirement |
| --- | --- |
| React Native | 0.86 or later with the New Architecture enabled |
| React | 19.2 or later |
| iOS | 15 or later |
| Android | API 26 or later |
| Expo | A development build; Expo Go is not supported |
| Production integration | A partner backend that issues short-lived January client tokens |

## Start here

1. [Install the package](getting-started/installation.md).
2. [Build the partner token endpoint](getting-started/backend-token-endpoint.md).
3. [Configure authentication](getting-started/authentication.md).
4. [Run your first request](getting-started/quick-start.md).
5. Follow the [food hydration and serving flow](concepts/food-hydration-and-portions.md).

```ts
import { JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: 'America/New_York',
  clientTokenProvider: getJanuaryClientToken,
});

const results = await january.foods.search({ query: 'greek yogurt' });
```

Production mobile apps must use client tokens. Never ship a January server API
key in an iOS or Android application.
