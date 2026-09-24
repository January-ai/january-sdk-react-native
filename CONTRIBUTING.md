# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

Install Node.js 22 using the version in [`.nvmrc`](./.nvmrc), then enable
Corepack and install the pinned Yarn dependencies:

```shell
corepack enable
corepack yarn install --immutable
corepack yarn prepare
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development without manually migrating.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or Xcode to edit the native code, open
`example/android` in Android Studio or
`example/ios/JanuarySDKDemo.xcworkspace` in Xcode. The SDK's iOS sources appear
under `Pods > Development Pods > @januaryai/react-native`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `januaryai-react-native` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "JanuarySDKDemo" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

The web export is a compile-time check for shared demo UI code. The SDK itself
does not support React Native Web; browser applications should use
`@januaryai/web-sdk`.

```sh
yarn example build:web
```

Make sure your code passes TypeScript:

```sh
yarn typecheck
```

To check for linting errors, run the following:

```sh
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

### UI tests

The Maestro flows in `example/.maestro/flows/` drive the example app on a
device. The fixture and parity flows need no network: start fixture-mode
Metro with `yarn ui:start`, then run `yarn ui:test` from another terminal.

#### Flow coverage

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

#### Live end-to-end flows

The flows tagged `live` run the example against the January API through the
token relay, for one end user. They search foods, open a food's detail,
glucose response, and alternatives, look up a barcode, analyze a description
and the sample photo and correct the result, browse restaurants and menus,
predict glucose, create, rename, and delete a food log, log water and weight
in each unit, move between days, and read the charts. After every change they
read the end user's data back from the January API, through the same relay,
and fail if it differs from what the app shows.

1. Start the relay (`./start.sh` in the
   [January Token Relay](https://github.com/January-ai/january-token-relay))
   and keep it running.
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
fails. `--only <number>` runs one flow, for example
`corepack yarn ui:test:live --device <device-id> --only 97` for the check that
a searched food is logged as a number of servings. Every other flow first
makes one request to check that the January API is answering (97 keeps to
about ten requests, so the app's first request finds out instead); if the
account's request allowance is used up (`429 rate_limited`), the flow stops
there, before it changes anything, and the runner prints the command that
resumes the run, such as
`corepack yarn ui:test:live --device <device-id> --from 95`. The weight flow
runs last because weight logs cannot be deleted through the API, so a run
that cannot finish does not log a weight. Add `--debug-output <folder>` to
keep Maestro's logs and screenshots for each flow.

Use an end user reserved for testing: the flows add water and food logs and
remove them again, but each complete run adds two weights to that user's
history. The flows read the end user and timezone from the app's Settings;
97 first switches the app to the end user `e2e-qa-portion-rn`
(`-e END_USER=<id>` after `--` picks another) and switches it back at the end.
For a relay that is not on this computer, pass its address and token after
`--`, for example
`corepack yarn ui:test:live --device <device-id> -- -e JANUARY_TOKEN_ENDPOINT=<url> -e JANUARY_RELAY_TOKEN=<token>`.
`-e BARCODE=<upc>`, `-e RESTAURANT=<name>`, and `-e MENU_ITEM=<dish>` change
what the flows look up.

A complete run makes about 160 January API requests per device (the app's own
and the checks'), so check your plan's request allowance before running on
several devices in one day.

### Publishing to npm

Publishing is restricted to January maintainers. Follow
[`.github/RELEASING.md`](./.github/RELEASING.md): update the version and
changelog, create the matching tag and GitHub Release, and let the trusted
`publish.yml` workflow publish the package to npm.


### Scripts

The `package.json` file contains various scripts for common tasks:

- `corepack yarn install --immutable`: install pinned dependencies.
- `corepack yarn prepare`: build the distributable package.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with [ESLint](https://eslint.org/).
- `yarn test`: run unit tests with [Jest](https://jestjs.io/).
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.
- `yarn example build:web`: build the example app for Web.
  
### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
