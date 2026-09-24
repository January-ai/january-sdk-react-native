# Example app

The `example/` directory is an Expo development-build application covering
foods, restaurants, meal analysis, food, water, and weight logs, glucose
prediction, and profile unit selection on both iOS and Android.

The Tracking tab shows one day at a time: the day’s totals from
`foodLogs.getSummary`, the meals logged that day, the day’s water total (in
fluid ounces, milliliters, or US cups, with delete of the last entry), and the
day’s latest weight (in pounds or kilograms). Switching a card’s unit converts
an amount already typed, so it is logged as the same quantity. Move between
days to browse history; water or a weight logged for a past day is dated noon
on that day. The demo’s client uses the device’s timezone, and “today” is the
device’s calendar date. Under each card a chart shows the last week, month, or year, ending
today: weight as a line in the card’s unit, from `weightLogs.list`, and water
as daily bars (monthly for a year) from `waterLogs.list`. Each list call
returns at most 100 days, so a year is read in consecutive 90-day requests.
The Logs tab lists food logs for today, this week, or the last month,
with their summary, and creates, edits, and deletes them.

## Run locally

First complete the two dashboard steps in the
[repository README](https://github.com/January-ai/january-sdk-react-native#quick-start-run-the-demo-with-client-tokens),
run the standalone
[January Token Relay](https://github.com/January-ai/january-token-relay) with
`./start.sh`, then copy the example environment:

```sh
cp example/.env.example example/.env
corepack yarn install
corepack yarn example ios
# or
corepack yarn example android
```

The template points at the relay on port `8787` and works unchanged on both
platforms: `yarn example android` starts an emulator if none is running and
forwards ports `8081` and `8787` into it (or into a USB-connected phone).

Keep Metro running while editing TypeScript to use Fast Refresh. Because the SDK
contains native code, rebuild the development client after changing native
bridge code or SDK dependencies.

## Optional hosted development relay

Follow the relay's
[Vercel guide](https://github.com/January-ai/january-token-relay#deploy),
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
