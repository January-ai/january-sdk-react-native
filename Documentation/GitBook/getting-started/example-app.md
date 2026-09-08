# Example app

The `example/` directory is an Expo development-build application covering
foods, restaurants, meal analysis, food logs, glucose prediction, and profile
unit selection on both iOS and Android.

## Run locally

First complete the two dashboard steps in the root README, run the standalone
January Token Relay with `./start.sh`, then copy the example environment:

```sh
cp example/.env.example example/.env
corepack yarn install
corepack yarn example ios
# or
corepack yarn example android
```

The template points the iOS Simulator to the relay on port `8787`. For Android
Emulator, replace `127.0.0.1` with `10.0.2.2`.

Keep Metro running while editing TypeScript to use Fast Refresh. Because the SDK
contains native code, rebuild the development client after changing native
bridge code or SDK dependencies.

## Optional hosted development relay

Follow the relay's
[Vercel guide](https://github.com/January-ai/january-token-relay#optional-deploy-to-vercel),
then set `EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT` to its HTTPS token URL and
`EXPO_PUBLIC_DEMO_SESSION_TOKEN` to its `RELAY_TOKEN`. This is for development
and testing only; production must use your authenticated backend.

## Optional debug-only shortcut

If you need the fastest private test, omit the token endpoint and set
`EXPO_PUBLIC_JANUARY_API_KEY` in `example/.env`. Do not commit the file or
distribute that build. Prefer the relay flow above because it keeps the server
API key out of the app.

## Deterministic UI testing

Start fixture-mode Metro:

```sh
corepack yarn ui:start
```

Then run the Maestro suite from another terminal:

```sh
corepack yarn ui:test
```

The fixture and parity flows live in `example/.maestro/flows/`.
