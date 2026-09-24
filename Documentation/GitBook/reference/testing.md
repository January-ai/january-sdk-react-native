# Testing

## Unit tests

Jest has no native module, so `new JanuaryClient` throws
`@januaryai/react-native is not linked…`. Mock the package:

```ts
jest.mock('@januaryai/react-native', () => ({
  JanuaryClient: jest.fn(() => ({
    foods: { search: jest.fn(async () => ({ items: [], totalCount: 0 })) },
    dispose: jest.fn(),
  })),
}));
```

Add the resources and methods your code calls. Alternatively, wrap the client
in a small service of your own and replace that in tests.

## On a device

Linking, token refresh, and voice capture need the native SDKs, so test them in
a development build on a simulator, emulator, or device. During development,
point the token provider at the
[token relay](https://docs.january.ai/docs/authentication#develop-with-the-token-relay) and use
a test end-user ID, so test data stays apart from real users.
