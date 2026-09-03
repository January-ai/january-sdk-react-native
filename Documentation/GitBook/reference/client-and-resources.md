# Client and resources

`JanuaryClient` is the package’s primary entry point:

```ts
new JanuaryClient({
  endUserId,
  timezone,
  clientTokenProvider,
});
```

For local Debug use, replace `clientTokenProvider` with `developmentApiKey`.
These authentication modes are mutually exclusive in TypeScript.

| Resource | Purpose |
| --- | --- |
| `foods` | Autocomplete, search, hydration, barcode lookup, alternatives |
| `restaurants` | Restaurant search, menu-item search, restaurant menus |
| `foodAnalysis` | Description analysis, photo analysis, corrections |
| `foodLogs` | Create, list, update, and delete food logs |
| `glucose` | Personalized glucose prediction |

Call `dispose()` exactly once when the client’s user session ends. Repeated
disposal is safe.

`getNativeModuleVersion()` returns the linked native module version and is
useful when diagnosing installation issues.
