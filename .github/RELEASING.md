# Releasing the React Native SDK

## Dependency order

Before releasing, verify that the versions declared by
`JanuaryReactNative.podspec` and `android/build.gradle` are already public:

1. `JanuaryPartnerTransport` and `January` on CocoaPods Trunk.
2. `ai.january:january-sdk-android` on Maven Central.

Never release the React Native wrapper against an unpublished native version or
against a native repository branch.

## npm authentication

The `@januaryai/react-native` package uses npm trusted publishing for this
repository and `.github/workflows/publish.yml`. Do not add a long-lived npm
token to the repository or workflow.

## Release process

1. Update the wrapper version and both pinned native SDK versions.
2. Update `CHANGELOG.md`.
3. Run the checks and build both example applications.
4. Create and push the matching `v<version>` tag.
5. Publish the GitHub Release for that tag.

Publishing the GitHub Release runs `.github/workflows/publish.yml`, which
validates the tag, builds and tests the package, verifies its tarball, and
publishes it to npm. Prerelease versions are published under the `beta` dist-tag.
