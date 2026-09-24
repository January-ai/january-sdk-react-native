# Example app

The [SDK repository](https://github.com/January-ai/january-sdk-react-native)
contains an Expo example app for iOS and Android that uses every part of the
SDK, with the [token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay)
standing in for your backend.

## Run it

You need Node.js 22 or later, and Xcode or Android Studio.

1. In the [Developer Dashboard](https://dashboard.january.ai), create an API key
   (**API keys → Create key**) and turn on **Enable client tokens** under
   [Client tokens](https://dashboard.january.ai/dashboard/client-tokens).
2. Start the relay, and paste the key when it asks:

   ```sh
   git clone https://github.com/January-ai/january-token-relay.git
   cd january-token-relay
   ./start.sh
   ```

3. In a second terminal, clone the SDK repository and run the example:

   ```sh
   git clone https://github.com/January-ai/january-sdk-react-native.git
   cd january-sdk-react-native
   cp example/.env.example example/.env
   corepack yarn install
   corepack yarn example ios    # or: corepack yarn example android
   ```

   The `.env` template points at the relay on port 8787. On Android, the
   command starts an emulator if none is running and forwards the relay into
   it.
4. Search for `banana`. The relay prints `minted=true status=201` when the app
   gets its first token.

To reach a relay hosted elsewhere, set `EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT` to
its token URL and `EXPO_PUBLIC_DEMO_SESSION_TOKEN` to its relay token. Setting
`EXPO_PUBLIC_JANUARY_API_KEY` instead skips the relay in debug builds; keep
that build on your machine
([Development API key](authentication.md#development-api-key)).

## What each tab shows

| Tab | SDK calls | Source in `example/src` |
| --- | --- | --- |
| Search | `foods.autocomplete`, `search`, `lookupBarcode`, `get`, `suggestAlternatives`; `foodAnalysis.analyzeDescription`; `restaurants.*`; voice input | `App.tsx`, `FoodDetailScreen.tsx`, `RestaurantScreens.tsx` |
| Scan | `foodAnalysis.analyzePhoto`, `correct` | `ScanScreen.tsx`, `scanCorrection.ts` |
| Tracking | `foodLogs.getSummary`, `list`; `waterLogs.*`; `weightLogs.*` | `TrackingScreen.tsx`, `TrackingCharts.tsx` |
| Logs | `foodLogs.*` | `FoodLogsScreen.tsx` |
| Glucose | `glucose.predict` | `GlucoseScreen.tsx` |

Files worth copying:

* [`localDate.ts`](https://github.com/January-ai/january-sdk-react-native/blob/main/example/src/localDate.ts):
  the device timezone, local `YYYY-MM-DD` dates, and noon timestamps for past
  days.
* [`relayTokenProvider.ts`](https://github.com/January-ai/january-sdk-react-native/blob/main/example/src/relayTokenProvider.ts):
  a token provider for the relay.
* [`VoiceInputButton.tsx`](https://github.com/January-ai/january-sdk-react-native/blob/main/example/src/VoiceInputButton.tsx):
  a tap-to-start, tap-to-stop microphone button.

Next: [Client lifecycle](../concepts/client-lifecycle.md).
