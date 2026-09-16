import {
  PermissionsAndroid,
  Platform,
  type EventSubscription,
} from 'react-native';

import NativeJanuaryReactNative, {
  type VoiceCaptureUpdate,
} from './NativeJanuaryReactNative';

export type VoiceCaptureState =
  'idle' | 'requestingPermission' | 'recording' | 'processing';

export type VoiceCaptureErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'recognizer_unavailable'
  | 'recording_failed'
  | 'transcription_failed'
  | 'no_match'
  | 'invalid_state'
  | 'cancelled'
  | 'unknown';

const knownCodes: ReadonlySet<string> = new Set<VoiceCaptureErrorCode>([
  'unsupported',
  'permission_denied',
  'recognizer_unavailable',
  'recording_failed',
  'transcription_failed',
  'no_match',
  'invalid_state',
  'cancelled',
  'unknown',
]);

export class VoiceCaptureError extends Error {
  readonly code: VoiceCaptureErrorCode;

  constructor(code: VoiceCaptureErrorCode, message: string) {
    super(message);
    this.name = 'VoiceCaptureError';
    this.code = code;
  }
}

export interface VoiceCaptureOptions {
  /** BCP 47 tag such as `en-US`. Defaults to the device locale. */
  locale?: string;
}

export interface VoiceCaptureResult {
  /** Recognized speech, trimmed. */
  transcript: string;
  /** Capture duration in milliseconds. */
  durationMs: number;
}

export interface VoiceCaptureSnapshot {
  /** Set when the recognizer ended the capture on its own, for example with no speech. Cleared on the next `start()`. */
  error?: { code: VoiceCaptureErrorCode; message: string };
  /**
   * Set when the recognizer finished the capture on its own with speech (Android ends a
   * capture after a pause). Call `stop()` to collect it; cleared on the next `start()`.
   */
  result?: VoiceCaptureResult;
  state: VoiceCaptureState;
  /** Normalized microphone level from 0 (silent) to 1. */
  audioLevel: number;
  durationMs: number;
  /** Best partial recognition while recording. Android only; empty on iOS until `stop()` resolves. */
  partialTranscript: string;
}

const idleSnapshot: VoiceCaptureSnapshot = {
  state: 'idle',
  audioLevel: 0,
  durationMs: 0,
  partialTranscript: '',
};

let nextSessionId = 1;

function requireNativeModule() {
  if (!NativeJanuaryReactNative) {
    throw new VoiceCaptureError(
      'unsupported',
      'The January native module is not linked. Rebuild the app after installing @januaryai/react-native.'
    );
  }
  return NativeJanuaryReactNative;
}

function toVoiceCaptureError(error: unknown): VoiceCaptureError {
  if (error instanceof VoiceCaptureError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Voice capture failed.';
  return new VoiceCaptureError(
    typeof code === 'string' && knownCodes.has(code)
      ? (code as VoiceCaptureErrorCode)
      : 'unknown',
    message
  );
}

/**
 * Microphone capture and on-device speech recognition through the native January SDKs
 * (Apple Speech on iOS, Android SpeechRecognizer on Android).
 *
 * Create one session per input, subscribe before `start()`, and call `start()` from a user
 * gesture. Android needs the `RECORD_AUDIO` runtime permission before `start()`; iOS needs
 * `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` in Info.plist.
 *
 * The SDK does not send audio to January. iOS buffers the recording in a temporary file on
 * the device and deletes it once transcription finishes or the capture is cancelled; Android
 * streams to the recognizer without a file. Recognition runs through the platform speech
 * service, which may process audio off the device under the platform's own terms.
 */
export class VoiceCaptureSession {
  readonly isSupported: boolean;

  private readonly sessionId = `january-voice-${Date.now()}-${nextSessionId++}`;
  private readonly locale: string | null;
  private readonly listeners = new Set<
    (snapshot: VoiceCaptureSnapshot) => void
  >();
  private current: VoiceCaptureSnapshot = idleSnapshot;
  private subscription?: EventSubscription;
  private disposed = false;
  private active = false;
  /** Bumped by start() and cancel() so a stale in-flight operation cannot touch a newer capture. */
  private generation = 0;
  /** Sent to the native start(); native updates echo it so stale ones are dropped. */
  private captureId = '';
  private pendingStart?: Promise<void>;

  constructor(options: VoiceCaptureOptions = {}) {
    this.locale = options.locale ?? null;
    let supported = false;
    try {
      supported = requireNativeModule().voiceCaptureIsSupported(this.locale);
    } catch {
      supported = false;
    }
    this.isSupported = supported;
  }

  /** The latest state, level, duration, and partial transcript. */
  get snapshot(): VoiceCaptureSnapshot {
    return { ...this.current };
  }

  /** Receives every state change. Returns an unsubscribe function. */
  subscribe(listener: (snapshot: VoiceCaptureSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Requests permissions if needed and starts recording. Resolves once the microphone is live.
   * On Android this asks for `RECORD_AUDIO` at runtime; on iOS the native SDK asks for
   * microphone and speech-recognition access.
   */
  async start(): Promise<void> {
    this.assertUsable();
    if (!this.isSupported) {
      throw new VoiceCaptureError(
        'unsupported',
        'Speech recognition is not available on this device.'
      );
    }
    // A previous start() may still be awaiting the permission prompt or the native
    // recognizer after cancel(); let it settle so two starts never overlap natively.
    if (this.pendingStart) await this.pendingStart.catch(() => undefined);
    if (this.current.state !== 'idle') {
      throw new VoiceCaptureError(
        'invalid_state',
        'Voice capture is already active.'
      );
    }
    this.ensureSubscription();
    this.active = true;
    const generation = ++this.generation;
    this.captureId = `${this.sessionId}#${generation}`;
    this.publish({ ...idleSnapshot, state: 'requestingPermission' });
    const run = (async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new VoiceCaptureError(
              'permission_denied',
              'Microphone access is required for voice input.'
            );
          }
        }
        // cancel() or dispose() may have run while the permission prompt was open;
        // starting the recognizer now would leave it recording with no owner.
        this.assertCurrent(generation);
        await requireNativeModule().voiceCaptureStart(
          this.sessionId,
          this.locale,
          this.captureId
        );
        if (generation !== this.generation) {
          // Cancelled while the native start was in flight: release it again.
          try {
            requireNativeModule().voiceCaptureCancel(this.sessionId);
          } catch {
            // Nothing to release.
          }
          this.assertCurrent(generation);
        }
        // The native call resolves once the microphone is live; the first native
        // update may still be in flight.
        if (this.snapshot.state === 'requestingPermission') {
          this.publish({ ...this.current, state: 'recording' });
        }
      } catch (error) {
        // Only the start that still owns the session may reset it; a stale
        // failure must not disturb a capture started after cancel().
        if (generation === this.generation) {
          this.active = false;
          this.publish(idleSnapshot);
        }
        throw toVoiceCaptureError(error);
      }
    })();
    this.pendingStart = run;
    try {
      await run;
    } finally {
      if (this.pendingStart === run) this.pendingStart = undefined;
    }
  }

  /**
   * Stops recording and resolves with the transcript. Also collects a `result` or `error`
   * the recognizer produced on its own; rejects with `invalid_state` while permission is
   * still pending or a previous `stop()` is in flight.
   */
  async stop(): Promise<VoiceCaptureResult> {
    this.assertUsable();
    if (this.current.state === 'idle') {
      const { error: ended, result } = this.current;
      if (result) {
        this.publish(idleSnapshot);
        return result;
      }
      if (ended) {
        this.publish(idleSnapshot);
        throw new VoiceCaptureError(ended.code, ended.message);
      }
      throw new VoiceCaptureError(
        'invalid_state',
        'Voice capture is not recording.'
      );
    }
    if (this.current.state !== 'recording') {
      throw new VoiceCaptureError(
        'invalid_state',
        this.current.state === 'processing'
          ? 'Voice capture is already stopping.'
          : 'Voice capture is still waiting for permission.'
      );
    }
    this.active = false;
    const generation = this.generation;
    this.publish({ ...this.current, state: 'processing' });
    try {
      const raw = await requireNativeModule().voiceCaptureStop(this.sessionId);
      if (generation !== this.generation) {
        // cancel() (and possibly a new start()) ran while the native stop was in
        // flight; the result belongs to a capture the caller discarded.
        throw new VoiceCaptureError(
          'cancelled',
          'Voice capture was cancelled while stopping.'
        );
      }
      const parsed = JSON.parse(raw) as {
        transcript?: string;
        durationMs?: number;
      };
      return {
        transcript: (parsed.transcript ?? '').trim(),
        durationMs: parsed.durationMs ?? this.current.durationMs,
      };
    } catch (error) {
      throw toVoiceCaptureError(error);
    } finally {
      // Only the operation that still owns the session may reset it.
      if (generation === this.generation) this.publish(idleSnapshot);
    }
  }

  /** Discards the active capture without a result. */
  cancel(): void {
    this.active = false;
    this.generation += 1;
    if (this.disposed || this.current.state === 'idle') return;
    try {
      requireNativeModule().voiceCaptureCancel(this.sessionId);
    } catch {
      // The native session is already gone; nothing to release.
    }
    this.publish(idleSnapshot);
  }

  /** Cancels, releases the native session, and removes every subscriber. */
  dispose(): void {
    if (this.disposed) return;
    this.cancel();
    this.disposed = true;
    this.subscription?.remove();
    this.subscription = undefined;
    this.listeners.clear();
    try {
      requireNativeModule().voiceCaptureDispose(this.sessionId);
    } catch {
      // Nothing linked; nothing to dispose.
    }
  }

  private ensureSubscription(): void {
    if (this.subscription) return;
    this.subscription = requireNativeModule().onVoiceCaptureUpdate(
      (update: VoiceCaptureUpdate) => {
        if (update.sessionId !== this.sessionId || this.disposed) return;
        // An update from an earlier start() (queued before cancel() took effect)
        // must not touch the current capture.
        if (update.captureId != null && update.captureId !== this.captureId) {
          return;
        }
        if (update.errorCode && this.active) {
          this.active = false;
          this.publish({
            ...idleSnapshot,
            error: {
              code: knownCodes.has(update.errorCode)
                ? (update.errorCode as VoiceCaptureErrorCode)
                : 'unknown',
              message: update.errorMessage ?? 'Voice capture failed.',
            },
          });
          return;
        }
        if (update.transcript != null && this.active) {
          this.active = false;
          this.publish({
            ...idleSnapshot,
            result: {
              transcript: update.transcript.trim(),
              durationMs: Math.max(0, Math.round(update.durationMs)),
            },
          });
          return;
        }
        // Native cancellation is asynchronous: an update queued before cancel()
        // took effect must not revive a session that already returned to idle.
        if (!this.active) return;
        // A bare idle (no error, no transcript) is the recognizer's resting state, not
        // an outcome; the session publishes idle itself when stop() or cancel() settles.
        if (update.state === 'idle') return;
        this.publish({
          state: normalizeState(update.state),
          audioLevel: clamp(update.audioLevel),
          durationMs: Math.max(0, Math.round(update.durationMs)),
          partialTranscript: update.partialTranscript ?? '',
        });
      }
    );
  }

  private publish(snapshot: VoiceCaptureSnapshot): void {
    this.current = snapshot;
    for (const listener of this.listeners) listener({ ...snapshot });
  }

  private assertCurrent(generation: number): void {
    if (generation !== this.generation || !this.active) {
      throw new VoiceCaptureError(
        'cancelled',
        'Voice capture was cancelled before recording started.'
      );
    }
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new VoiceCaptureError(
        'invalid_state',
        'This voice capture session was disposed.'
      );
    }
  }
}

function normalizeState(value: string): VoiceCaptureState {
  switch (value) {
    case 'requestingPermission':
    case 'recording':
    case 'processing':
      return value;
    default:
      return 'idle';
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
