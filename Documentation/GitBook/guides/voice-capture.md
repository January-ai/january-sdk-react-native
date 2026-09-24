# Voice capture

`VoiceCaptureSession` records from the microphone and returns a transcript
using the device's own speech recognizer: Apple Speech on iOS and Android
`SpeechRecognizer` on Android. Use it for explicit, user-driven input such as
speaking a food name or a meal description.

The SDK does not send audio to January. On iOS the recording is buffered in a
temporary file on the device and deleted once transcription finishes or the
capture is canceled; on Android audio streams to the recognizer with no file.
Recognition runs through the platform's speech service, which may process audio
off the device under Apple's or Google's own terms; say so in your privacy
disclosures.

## Capture and transcribe

Create one session per input, subscribe before starting, and start and stop it
from the user's taps. `start()` resolves as soon as the microphone is live, so
the transcript comes from `stop()` on the next tap:

```ts
import { VoiceCaptureError, VoiceCaptureSession } from '@januaryai/react-native';

const voice = new VoiceCaptureSession({ locale: 'en-US' });

const unsubscribe = voice.subscribe((snapshot) => {
  setLevel(snapshot.audioLevel);
  setPartial(snapshot.partialTranscript); // Android only
  if (snapshot.error) showMessage(snapshot.error.code); // for example no_match
  if (snapshot.result) void finish(); // Android ends a capture after a pause
});

function report(error: unknown) {
  if (error instanceof VoiceCaptureError) showMessage(error.code);
}

// The microphone button's onPress: tap to start, tap again to stop.
async function onMicPress() {
  if (voice.snapshot.state === 'recording') return finish();
  await voice.start().catch(report); // resolves once the microphone is live
}

async function finish() {
  try {
    setQuery((await voice.stop()).transcript);
  } catch (error) {
    report(error);
  }
}

// On unmount: unsubscribe(); voice.dispose();
```

A complete React button is in the example app's
[`VoiceInputButton.tsx`](https://github.com/January-ai/january-sdk-react-native/blob/main/example/src/VoiceInputButton.tsx).

## Methods

| Member | Behavior |
| --- | --- |
| `isSupported` | `false` on devices without a speech recognizer, such as some Android emulator images. Check it before showing a microphone. |
| `subscribe(listener)` | Calls `listener` with the current snapshot, then on every change. Returns an unsubscribe function. |
| `start()` | Valid in `idle`. Asks for permission if needed, then resolves once the microphone is live (`recording`). |
| `stop()` | In `recording`, resolves with the result once the recognizer has the final text. In `idle` after the recognizer ended the capture itself, returns its `result` or rejects with its `error`. Rejects with `invalid_state` while permission is pending, during another `stop()`, or with no capture. |
| `cancel()` | Discards the active capture. Safe in any state. |
| `dispose()` | Cancels, releases the native session, and removes subscribers. |
| `snapshot` | The latest snapshot. |

## Snapshots, results, and errors

| Snapshot field | Meaning |
| --- | --- |
| `state` | `idle`, `requestingPermission`, `recording`, or `processing` |
| `audioLevel` | Microphone level from 0 to 1 |
| `durationMs` | Recording length so far |
| `partialTranscript` | Best text so far; Android only, empty on iOS |
| `result` | Set in `idle` when the recognizer ended the capture with text |
| `error` | Set in `idle` when the recognizer ended the capture with an error |

A result has `transcript` (trimmed) and `durationMs`. Failures are
`VoiceCaptureError` with a stable `code`: `unsupported`, `permission_denied`,
`recognizer_unavailable`, `recording_failed`, `transcription_failed`,
`no_match`, `invalid_state`, `cancelled`, or `unknown`.

## Permissions

iOS needs `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`
in `Info.plist` (Expo: `ios.infoPlist` in `app.json`). The SDK asks for both
when `start()` runs.

On Android, the January Android SDK's manifest declares
`android.permission.RECORD_AUDIO`, which merges into your app. `start()`
requests it at runtime and rejects with `permission_denied` if the user
declines, so the app does not need its own `PermissionsAndroid` call.
