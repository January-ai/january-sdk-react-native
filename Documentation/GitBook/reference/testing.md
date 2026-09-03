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

CI builds the app and runs these same Maestro flows independently on both
platforms.

For application tests, mock the module at your integration boundary or wrap the
`JanuaryClient` instance in a small service that can be replaced in unit tests.
Use a real development build for linking and end-to-end verification.
