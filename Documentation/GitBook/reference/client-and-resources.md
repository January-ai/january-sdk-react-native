# Client and resources

`JanuaryClient` is the package's entry point.

```ts
new JanuaryClient({ endUserId, timezone, clientTokenProvider });
```

| Option | Type | Notes |
| --- | --- | --- |
| `endUserId` | `string` | Required. See [User identity and timezone](../concepts/user-identity-and-timezone.md). |
| `timezone` | `string` | An IANA name; recommended. Same page. |
| `clientTokenProvider` | `JanuaryTokenProvider` | `(endUserId) => Promise<{ token, expiresIn }>`; see [Authentication](../getting-started/authentication.md). |
| `developmentApiKey` | `string` | Debug builds only; replaces `clientTokenProvider`. See [Development API key](../getting-started/authentication.md#development-api-key). |

`clientTokenProvider` and `developmentApiKey` are mutually exclusive in the
TypeScript types.

| Resource | Purpose |
| --- | --- |
| `foods` | Autocomplete, search, get a food, barcode lookup, alternatives |
| `restaurants` | Restaurant search, menu-item search, restaurant menus |
| `foodAnalysis` | Description analysis, photo analysis, corrections |
| `foodLogs` | Create, list, summarize, update, and delete food logs |
| `waterLogs` | Log water, read daily totals, delete a log |
| `weightLogs` | Log a weight, read the latest weight per day |
| `glucose` | Personalized glucose prediction |

`dispose()` releases the client; see [Client lifecycle](../concepts/client-lifecycle.md).

Other exports:

* `getNativeModuleVersion()` returns the package version, such as `"0.3.0"`,
  when the native module is linked, and `null` when it isn't
  ([Confirm linking](../getting-started/installation.md#confirm-linking)).
* `VoiceCaptureSession` and `VoiceCaptureError`; see
  [Voice capture](../guides/voice-capture.md).
* `FoodCategory`, with the category strings `generic`, `branded`, and `recipe`
  as constants.
