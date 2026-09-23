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

For application tests, mock the module at your integration boundary or wrap the
`JanuaryClient` instance in a small service that can be replaced in unit tests.
Use a real development build for linking and end-to-end verification.
