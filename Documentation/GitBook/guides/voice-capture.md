# Voice capture

`VoiceCaptureSession` records from the microphone and returns a transcript
using the device's own speech recognizer: Apple Speech on iOS and Android
`SpeechRecognizer` on Android. It is meant for explicit, user-driven input such
as speaking a food name or a meal description. No audio is retained or uploaded
by the SDK.

## Capture and transcribe

Create one session per input, subscribe before starting, and call `start()`
from a user gesture:

```ts
import {
  VoiceCaptureError,
  VoiceCaptureSession,
  type VoiceCaptureSnapshot,
} from '@januaryai/react-native';

const voice = new VoiceCaptureSession({ locale: 'en-US' });

const unsubscribe = voice.subscribe((snapshot: VoiceCaptureSnapshot) => {
  setLevel(snapshot.audioLevel);
  setSeconds(Math.floor(snapshot.durationMs / 1000));
  setPartial(snapshot.partialTranscript); // Android streams partial text
});

try {
  await voice.start();
  const result = await voice.stop();
  setQuery(result.transcript);
} catch (error) {
  if (error instanceof VoiceCaptureError) showMessage(error.code);
}

unsubscribe();
voice.dispose();
```

`stop()` resolves once the recognizer produces its final text. `cancel()`
discards the active capture; `dispose()` also releases the native session and
removes subscribers. Check `session.isSupported` before showing a microphone
control; it is `false` on devices without a speech recognizer, such as some
Android emulator images.

## Result and states

| Field | Meaning |
| --- | --- |
| `transcript` | Recognized text, trimmed |
| `durationMs` | Capture length in milliseconds |

Snapshot `state` moves through `idle`, `requestingPermission`, `recording`, and
`processing`. `audioLevel` is normalized from 0 to 1. Error codes are stable:
`unsupported`, `permission_denied`, `recognizer_unavailable`, `recording_failed`,
`transcription_failed`, `no_match`, `invalid_state`, `cancelled`, `unknown`.

## Permissions

iOS needs `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`
in Info.plist (Expo: `ios.infoPlist` in `app.json`). The SDK asks for both when
`start()` runs.

Android needs `android.permission.RECORD_AUDIO` in the manifest (Expo:
`android.permissions`), and the app must request it at runtime before `start()`:

```ts
import { PermissionsAndroid, Platform } from 'react-native';

if (Platform.OS === 'android') {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
}
await voice.start();
```

## Example app

The search field and the food picker in the example show a microphone whenever
the device supports speech recognition (not in barcode mode). Recording shows a
level meter and a timer; stopping fills the query with the transcript and runs
the search.
