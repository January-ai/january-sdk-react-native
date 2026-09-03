# Releasing the React Native SDK

## Dependency order

Before releasing, verify that the versions declared by
`JanuaryReactNative.podspec` and `android/build.gradle` are already public:

1. `JanuaryPartnerTransport` and `January` on CocoaPods Trunk.
2. `ai.january:january-sdk-android` on Maven Central.

Never release the React Native wrapper against an unpublished native version or
against a native repository branch.

## First npm release

The npm trusted publisher can only be configured after the package exists.
For the first release, a maintainer of the `januaryai` npm organization must:

1. Authenticate locally with npm and publish the package from a clean release
   commit using `npm publish --access public --tag beta`.
2. Configure the package's npm trusted publisher with:
   - Organization: `January-ai`
   - Repository: `january-sdk-react-native`
   - Workflow: `publish.yml`
   - Allowed action: `npm publish`

## Subsequent releases

1. Update the wrapper version and both pinned native SDK versions.
2. Update `CHANGELOG.md`.
3. Run the checks and build both example applications.
4. Create and push the matching `v<version>` tag.
5. Publish the GitHub Release for that tag.

Publishing the GitHub Release runs `.github/workflows/publish.yml`, which
validates the tag, builds and tests the package, verifies its tarball, and
publishes it to npm. Prerelease versions are published under the `beta` dist-tag.
