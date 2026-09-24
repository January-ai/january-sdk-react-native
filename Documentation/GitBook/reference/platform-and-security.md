# Platform and security

The npm package provides a TypeScript API and a TurboModule bridge. January's
native SDK on each platform makes the API calls.

| Platform | Native dependency |
| --- | --- |
| iOS | `January`, through CocoaPods |
| Android | `ai.january:january-sdk-android`, from Maven Central |
| React Native Web | Not supported; use `@januaryai/web-sdk` |

## Pinned native versions

Each React Native SDK release pins one iOS and one Android SDK version, so
every app gets the combination that release was tested with. Don't add either
native SDK to your app separately.

| React Native SDK | iOS `January` | Android `january-sdk-android` | React Native | Android API |
| --- | --- | --- | --- | --- |
| 0.3.0 | 0.3.1 | 0.3.1 | 0.83 or later | 24 or later |
| 0.2.1 | 0.2.0 | 0.2.2 | 0.83 or later | 24 or later |
| 0.2.0 | 0.2.0 | 0.2.1 | 0.83 or later | 24 or later |
| 0.1.0 | 0.1.0 | 0.1.1 | 0.86 or later | 26 or later |

Upgrading to 0.3 adds water and weight logs, which need the `water_logs:*` and
`weight_logs:*` scopes in the tokens your backend mints.

## Security

The rules for the API key are in
[Keep the API key off the device](../getting-started/backend-token-endpoint.md#keep-the-api-key-off-the-device),
and the rules for your token endpoint in
[Your token endpoint](https://docs.january.ai/docs/authentication#your-token-endpoint).
