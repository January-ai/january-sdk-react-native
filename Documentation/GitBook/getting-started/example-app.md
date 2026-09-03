# Example app

The `example/` directory is an Expo development-build application covering
foods, restaurants, meal analysis, food logs, glucose prediction, and profile
unit selection on both iOS and Android.

## Run locally

```sh
corepack yarn install
corepack yarn example ios
# or
corepack yarn example android
```

Keep Metro running while editing TypeScript to use Fast Refresh. Because the SDK
contains native code, rebuild the development client after changing native
bridge code or SDK dependencies.

## Authentication

Copy `example/.env.example` and configure the Debug-only API key for local
development. Do not commit the resulting environment file or distribute that
build.

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
