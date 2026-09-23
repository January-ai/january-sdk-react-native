# Testing

## Package checks

```sh
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn prepare
npm pack --dry-run
```

## Native builds

Run both example applications after native bridge or dependency changes:

```sh
corepack yarn example ios
corepack yarn example android
```

## UI tests

The demo uses deterministic fixtures for device-level coverage:

```sh
corepack yarn ui:start
corepack yarn ui:test
```

The complete suite covers functional fixture flows and parity with the native
iOS and Android demo applications. The local `ui:test` command targets the
currently selected device. Run it once for iOS and once for Android, or select
each device explicitly:

```sh
maestro test --device <device-id> example/.maestro/flows \
  --include-tags fixture,parity \
  --shard-split 1
```

Every screen has its loading, empty, error, and success states in the fixture
flows. Fixture mode reaches the states on demand: particular search words (for
example `no results`, `detail error`, `search error`, or `menu empty`), and a
long press on a control that re-runs its request with a failure, such as
**Previous day** on the Tracking tab or a drawn Tracking chart.

### Flow coverage

A device-free check confirms that the flows exercise every test ID the example
app declares, and that no flow refers to an ID the app no longer has:

```sh
corepack yarn ui:coverage
```

It prints `UI coverage: <exercised>/<declared> (<percent>)`, lists anything
missing, and fails unless coverage is 100%. A test ID counts when a flow taps
it, types into it, scrolls to it, waits for it, copies from it, or asserts that
it is visible; optional steps and `assertNotVisible` do not count. Add
`--verbose` to list every ID with the flows that use it.

### Live end-to-end flows

The flows tagged `live` run the example against the January API through the
token relay, for one end user. They search foods, open a food's detail,
glucose response, and alternatives, look up a barcode, analyze a description
and the sample photo and correct the result, browse restaurants and menus,
predict glucose, create, rename, and delete a food log, log water and weight
in each unit, move between days, and read the charts. After every change they
read the end user's data back from the January API, through the same relay,
and fail if it differs from what the app shows.

1. Start the relay (`./start.sh` in `january-token-relay`) and keep it running.
2. Point the app at it and choose a test end user in `example/.env`:

   ```sh
   EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT=http://127.0.0.1:8787/api/january/client-token
   EXPO_PUBLIC_DEMO_END_USER_ID=my-test-user
   ```

3. Start Metro without fixtures, and on Android forward the relay's port:

   ```sh
   corepack yarn example start --clear
   adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8787 tcp:8787
   ```

4. Run the flows on one device:

   ```sh
   corepack yarn ui:test:live --device <device-id>
   ```

The runner starts each live flow on its own and pauses 30 seconds between
flows (`--pause <seconds>` changes that), and it stops at the first flow that
fails. Every flow first makes one request to check that the January API is
answering; if the account's request allowance is used up (`429
rate_limited`), the flow stops there, before it changes anything, and the
runner prints the command that resumes the run, such as
`corepack yarn ui:test:live --device <device-id> --from 95`. The weight flow
runs last because weight logs cannot be deleted through the API, so a run
that cannot finish does not log a weight. Add `--debug-output <folder>` to
keep Maestro's logs and screenshots for each flow.

Use an end user reserved for testing: the flows add water and food logs and
remove them again, but each complete run adds two weights to that user's
history. The flows read the end user and timezone from the app's Settings.
For a relay that is not on this computer, pass its address and token after
`--`, for example
`corepack yarn ui:test:live --device <device-id> -- -e JANUARY_TOKEN_ENDPOINT=<url> -e JANUARY_RELAY_TOKEN=<token>`.
`-e BARCODE=<upc>`, `-e RESTAURANT=<name>`, and `-e MENU_ITEM=<dish>` change
what the flows look up.

A complete run makes about 150 January API requests per device (the app's own
and the checks'), so check your plan's request allowance before running on
several devices in one day.

For application tests, mock the module at your integration boundary or wrap the
`JanuaryClient` instance in a small service that can be replaced in unit tests.
Use a real development build for linking and end-to-end verification.
