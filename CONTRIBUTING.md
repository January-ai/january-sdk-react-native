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
