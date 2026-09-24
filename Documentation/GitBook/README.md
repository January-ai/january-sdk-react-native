# January SDK for React Native

Build food discovery, restaurant search, food analysis, voice capture, food,
water, and weight logging, and glucose-prediction experiences from one typed
TypeScript API. The package uses January's native Swift SDK on iOS and Kotlin
SDK on Android through a React Native TurboModule.

## What you can build

* Food autocomplete, search, barcode lookup, food details, and alternatives
* Nearby restaurant and menu-item discovery
* Food analysis from a description, an image URL, or a base64 data URI
* Voice capture that turns speech into a food query or meal description
* Food-log creation, listing, summaries, updates, and deletion
* Water logs with daily totals, and weight logs with the latest weight per day
* Personalized glucose-impact predictions

## Requirements

| Component | Requirement |
| --- | --- |
| React Native | 0.83 or later (New Architecture, always on since 0.82) |
| React | 19.2 or later |
| iOS | 15.1 or later |
| Android | API 24 or later, compileSdk 36; every app enables core library desugaring |
| Android toolchain | JDK 17–21 |
| Expo | Expo SDK 55 or later, in a development build (not Expo Go) |
| React Native Web | Not supported; use `@januaryai/web-sdk` |
| Your backend | An endpoint that returns client tokens ([Backend token endpoint](getting-started/backend-token-endpoint.md)) |

## Start here

1. [Install the package](getting-started/installation.md).
2. [Add the token endpoint to your backend](getting-started/backend-token-endpoint.md),
   or run the token relay for now.
3. [Write the token provider and create the client](getting-started/authentication.md).
4. [Make your first request](getting-started/quick-start.md).
5. [Turn a search result into a food you can log](concepts/food-hydration-and-portions.md).

```ts
import { JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: user.id,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  clientTokenProvider: tokenProvider,
});

const results = await january.foods.search({ query: 'greek yogurt' });
```
