# Troubleshooting

## The package is not linked

The JavaScript package is installed but the current native binary does not
contain its TurboModule. Run `npx pod-install` on iOS, clean if necessary, and
rebuild the native application. Restarting Metro alone is insufficient.

## Expo Go cannot load the SDK

The SDK contains custom native code and does not run in Expo Go. Create and run
an Expo development build with `npx expo run:ios` or `npx expo run:android`.

## iOS cannot resolve January

Confirm CocoaPods can reach the public trunk, update local specs if needed, and
run pod installation again. Do not add a second `January` dependency manually.

## Android cannot resolve the native SDK

Confirm the project includes Maven Central and is online during dependency
resolution. Do not add another version of `ai.january:january-sdk-android`.

## Requests fail after sign-out

Create a new client for the next authenticated user. A disposed client rejects
further calls by design.

## Authentication repeatedly fails

Verify the backend response contains a non-empty `token` and numeric
`expiresIn`, that the token is issued for the same `endUserId`, and that the
mobile request includes valid partner-session authentication.
