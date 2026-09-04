# January SDK for React Native

The official React Native SDK for January food discovery, restaurants, food
analysis, food logs, and glucose prediction. It exposes one TypeScript API and
uses January's native Swift and Kotlin SDKs on iOS and Android.

React Native Web is not supported; use `@januaryai/web-sdk` in browsers.

## Requirements

- React Native 0.86+ with the New Architecture
- React 19.2+
- iOS 15.1+
- Android API 26+
- JDK 17 for Android builds

## Quick start: run the demo with client tokens

You can try the React Native SDK before your own backend is ready. A small
local Node server keeps the January API key off the app and issues the same
short-lived client tokens your production backend will issue.

### 1. Create the credentials

Complete both steps—they are on separate dashboard pages:

1. [Sign up](https://dashboard.january.ai/sign-up) or
   [sign in](https://dashboard.january.ai/sign-in), then open
   **API keys → Create key** and copy the full `sk-…` value.
2. Open [Client tokens](https://dashboard.january.ai/dashboard/client-tokens)
   and select **Enable client tokens**.

For production or any shared build, never put the `sk-…` key in a React Native
app. The private, debug-only shortcut at the end is the sole local exception.

### 2. Start the local token server

Install Node.js 22 or newer. In a first terminal:

```bash
git clone https://github.com/January-ai/january-server-sdk-node.git
cd january-server-sdk-node
npm ci
cp .env.example .env
# Edit .env and set JANUARY_API_KEY to the key you just created.
npm run demo:token-server
```

Leave it running. The server binds only to your computer and exchanges the API
key for short-lived tokens using the January Server SDK.

### 3. Run the React Native demo

In a second terminal, clone the demo repository if needed, then copy its
environment template:

```bash
git clone https://github.com/January-ai/january-sdk-react-native.git
cd january-sdk-react-native
cp example/.env.example example/.env
```

The template is ready for the iOS Simulator. For Android Emulator, change the
endpoint host from `127.0.0.1` to `10.0.2.2`. Then run:

```bash
corepack yarn install --immutable
corepack yarn example ios
# or: corepack yarn example android
```

Open the app and search for `banana`. This SDK uses native code, so the demo
runs as a development build rather than in Expo Go.

## Add the SDK to your app

### 1. Install

For a React Native application:

```bash
npm install @januaryai/react-native
npx pod-install
```

Autolinking installs the native module. Set the consuming Android application's
`minSdkVersion` to 26, then rebuild the app.

For an Expo application:

```bash
npx expo install @januaryai/react-native expo-build-properties
npx expo run:ios
# or
npx expo run:android
```

The SDK contains custom native code and requires an Expo development build. It
does not run in Expo Go. Configure `expo-build-properties` with Android
`minSdkVersion: 26`; the
[installation guide](Documentation/GitBook/getting-started/installation.md)
contains the complete configuration.

### 2. Connect and make the first request

```ts
import { JanuaryClient } from '@januaryai/react-native';

const january = new JanuaryClient({
  endUserId: session.user.id,
  timezone: 'America/New_York',
  clientTokenProvider: async (endUserId) => {
    const response = await fetch('/api/january/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'x-end-user-id': endUserId,
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

A successful request prints a result count; an empty result is still a successful
connection. Create one client for the signed-in user, reuse it, and call
`dispose()` when that user signs out. Token caching and refresh happen inside
the native SDK.

Run the consuming application normally:

```bash
npm run ios
# or
npm run android
```

Your production endpoint returns `{ "token": "ct-…", "expiresIn": 1800 }`,
derives the stable end-user ID from the verified app session, and chooses scopes
on the server. See the
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
the build, or distribute it. Move to the local token server or your
authenticated backend before testing anything outside your own machine.

## License

Apache 2.0. See [LICENSE](LICENSE).
