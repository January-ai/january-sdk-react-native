# January SDK for React Native

The official React Native SDK for January food discovery, restaurants, food
analysis, food logs, and glucose prediction. It exposes one TypeScript API and
uses January's native Swift and Kotlin SDKs on iOS and Android.

React Native Web is not supported; use `@januaryai/web-sdk` in browsers.

## Requirements

For an app that uses the SDK:

- React Native 0.83 or later with the New Architecture enabled
- React 19.2+
- iOS 15.1+
- Android 7.0+ (API 24); apps with `minSdkVersion` below 26 enable core library desugaring

To run the demo on your computer:

- Git and Node.js 22 or newer (Yarn comes with Node through `corepack`;
  nothing extra to install)
- iOS: a Mac with Xcode
- Android: Android Studio, with one virtual device created in **Device
  Manager**, or a phone with USB debugging on (Android Studio brings the SDK
  and a JDK; the demo command finds both)

## Quick start: run the demo with client tokens

You can try the React Native SDK before your own backend is ready. The
standalone January Token Relay keeps the January API key off the app and
temporarily stands in for your production token endpoint.

You need two terminal windows: one for the January Token Relay, which holds
your API key and hands the app short-lived client tokens, and one for the
demo. The first run takes about ten minutes.

### Terminal 1: start the token relay

1. Open a terminal.
2. Download the relay and move into its folder. Install Node.js 22 or newer
   first: this SDK's example needs 22, and the relay itself needs 20.12:

   ```bash
   git clone https://github.com/January-ai/january-token-relay.git
   cd january-token-relay
   ```

3. Start it:

   ```bash
   ./start.sh
   ```

   It checks your Node version and then asks
   `Paste your API key (input is hidden):`. Leave it waiting and create the
   key in the next two steps.

4. Create the API key. In a browser,
   [sign up](https://dashboard.january.ai/sign-up) or
   [sign in](https://dashboard.january.ai/sign-in) to the January Developer
   Dashboard, open **API keys → Create key**, and copy the full `sk-…` value.
   It is shown once.
5. Enable client tokens. Open
   [Client tokens](https://dashboard.january.ai/dashboard/client-tokens) and
   switch on **Enable client tokens**. Until this is on, January answers the
   relay with `403`.
6. Back in Terminal 1, paste the key and press Enter. Nothing appears while
   you type. You should see:

   ```text
   ✓ API key accepted by January (sk-abcd…wxyz)
   ✓ Saved to .env (readable only by you; git ignores it)

   January Token Relay is running on this machine (development only).
     Endpoint      http://localhost:8787/api/january/client-token
   ```

   Leave this window open for the whole session. The key is saved in a
   git-ignored `.env`, so the next `./start.sh` starts without asking.

### Terminal 2: run the React Native demo

7. Open a second terminal.
8. Download the SDK repository and move into it:

   ```bash
   git clone https://github.com/January-ai/january-sdk-react-native.git
   cd january-sdk-react-native
   ```

9. Copy the demo's environment template. It already points at the relay and
   works for both the iOS Simulator and Android:

   ```bash
   cp example/.env.example example/.env
   ```

10. Install dependencies and build the demo for one platform:

    ```bash
    corepack yarn install --immutable
    corepack yarn example ios
    # or: corepack yarn example android
    ```

    `corepack yarn` runs the Yarn version this repository pins; it ships with
    Node.js. On iOS the command builds the app and opens it in a simulator. On
    Android it finds the Android SDK and a JDK, starts an emulator you have
    created if none is running (or uses a phone plugged in with USB debugging),
    forwards the relay into it, then builds and opens the app. It works on
    macOS, Linux, and Windows. The first build compiles the native
    SDKs and takes several minutes; later builds take seconds. The SDK contains
    native code, so the demo runs as a development build, not in Expo Go.

11. When the app opens, search for `banana`. Terminal 1 prints
    `minted=true status=200` the first time the app asks for a token.

#### If something goes wrong

| You see | Cause | Fix |
| --- | --- | --- |
| Terminal 1: `403` / "Client tokens are switched off" | Step 5 not done | Turn on **Enable client tokens** in the dashboard; no restart needed |
| Terminal 1: "rejected the API key" | Key copied wrong or rotated | Delete `.env` in the relay folder, run `./start.sh`, paste again |
| Terminal 2: "No Android connected device found" | Android Studio not installed, or no emulator created yet | Install Android Studio, create a device in Device Manager, run the command again |
| App shows "Check your connection" or "Couldn't use the configured credentials" | Terminal 1 is not running | Run `./start.sh` again, tap **Try again** |
| App shows a "Development servers" screen | The app lost Terminal 2 | Tap `http://127.0.0.1:8081` |
| Red screen "Could not connect to development server" | Terminal 2 stopped | Run `corepack yarn example start`, then press `r` |

#### Prefer Android Studio and no second terminal?

Debug builds load their JavaScript from Terminal 2 (React Native's Metro
server), which is what makes editing live. A release build bundles the
JavaScript into the APK instead, so Android Studio alone can run it:

1. In `example/.env`, set the endpoint host to `10.0.2.2` for the emulator
   (that address is how the emulator reaches your computer) or to your
   computer's Wi-Fi address for a phone.
2. Android Studio → **File → Open** → the `example/android` folder. Let Gradle
   sync finish. Under **Settings → Build Tools → Gradle**, the Gradle JDK must
   be 17–21.
3. **Build Variants** (left edge) → set `app` to **release**.
4. Pick a device and press **Run**.

There is no hot reload in this mode; rebuild after code changes. Terminal 1
(the relay) is still required.

For production or any shared build, never put the `sk-…` key in a React Native
app. The private, debug-only shortcut at the end is the sole local exception.

### Optional: deploy the relay to Vercel

If localhost is inconvenient, follow the relay's
[Vercel deployment guide](https://github.com/January-ai/january-token-relay#deploy).
Set `JANUARY_API_KEY` and a long random `RELAY_TOKEN` in Vercel, then put these
values in `example/.env`:

```dotenv
EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT=https://YOUR-PROJECT.vercel.app/api/january/client-token
EXPO_PUBLIC_DEMO_SESSION_TOKEN=YOUR_RELAY_TOKEN
EXPO_PUBLIC_DEMO_END_USER_ID=january-sdk-demo-user
```

The hosted relay is also for development and testing only. Its relay token is
not a substitute for authenticating your users.

This relay is only for development. In production, keep the SDK token provider
but point it to your authenticated backend, which verifies the app session and
derives the end-user ID server-side.

## Add the SDK to your app

### 1. Install

For a React Native application:

```bash
npm install @januaryai/react-native
npx pod-install
```

Autolinking installs the native module. Set the consuming Android application's
`minSdkVersion` to 24 or higher; if it is below 26, also enable core library
desugaring in `android/app/build.gradle` (the SDK uses `java.time`), then
rebuild the app. The
[installation guide](Documentation/GitBook/getting-started/installation.md)
shows both snippets.

For an Expo application:

```bash
npx expo install @januaryai/react-native expo-build-properties
npx expo run:ios
# or
npx expo run:android
```

The SDK contains custom native code and requires an Expo development build. It
does not run in Expo Go. Configure `expo-build-properties` with Android
`minSdkVersion: 24` or higher and add `"@januaryai/react-native"` to
`expo.plugins` so the build enables core library desugaring; the
[installation guide](Documentation/GitBook/getting-started/installation.md)
contains the complete configuration.

### 2. Connect and make the first request

```ts
import { JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: 'America/New_York',
  clientTokenProvider: async (_endUserId) => {
    const response = await fetch('https://api.example.com/january/client-token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Token endpoint returned ${response.status}`);
    }
    return response.json();
  },
});

const foods = await january.foods.search({ query: 'banana' });
console.log(`Found ${foods.items.length} foods`);
```

`session` stands for your app's own login state: the signed-in user's stable ID
and the credential your backend already accepts. A successful request prints a
result count; an empty result is still a successful connection. Create one
client for the signed-in user, reuse it, and call `dispose()` when that user
signs out. Token caching and refresh happen inside the native SDK.

Run the consuming application normally:

```bash
npm run ios
# or
npm run android
```

Your production endpoint authenticates the app session, derives its stable
end-user ID without trusting a client-supplied ID, chooses scopes on the server,
and returns `{ "token": "ct-…", "expiresIn": 1800 }`. See the
[backend token endpoint guide](Documentation/GitBook/getting-started/backend-token-endpoint.md)
for the complete contract.

## Common tasks and documentation

The [complete React Native guide](Documentation/GitBook/README.md) covers
installation, production authentication, resources, errors, testing, and
troubleshooting.

- [Foods](Documentation/GitBook/guides/foods.md)
- [Restaurants](Documentation/GitBook/guides/restaurants.md)
- [Meal analysis](Documentation/GitBook/guides/meal-analysis.md)
- [Food logs](Documentation/GitBook/guides/food-logs.md)
- [Glucose prediction](Documentation/GitBook/guides/glucose-prediction.md)
- [Voice capture](Documentation/GitBook/guides/voice-capture.md)

For SDK development, testing, IDE setup, native dependency pins, and publishing,
see [CONTRIBUTING.md](CONTRIBUTING.md) and
[the release guide](.github/RELEASING.md).

## Optional: fastest debug-only shortcut

If you only want to make a request immediately, the demo can use a server API
key directly in a local development build. This bypasses the recommended
client-token flow above. Put this in the uncommitted `example/.env`:

```dotenv
EXPO_PUBLIC_JANUARY_API_KEY=sk-your-server-api-key
EXPO_PUBLIC_DEMO_END_USER_ID=january-sdk-demo-user
```

Then run `corepack yarn example ios` or `corepack yarn example android`. Because
`EXPO_PUBLIC_` values are compiled into the app, never commit the file, share
the build, or distribute it. Move to the local token relay or your
authenticated backend before testing anything outside your own machine.

## License

Apache 2.0. See [LICENSE](LICENSE).
