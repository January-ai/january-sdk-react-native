import type { EventSubscription } from 'react-native';

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
 * No audio is retained or uploaded by the SDK.
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

  constructor(options: VoiceCaptureOptions = {}) {
    this.locale = options.locale ?? null;
    let supported = false;
    try {
      supported = requireNativeModule().voiceCaptureIsSupported();
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

  /** Requests permissions if needed and starts recording. Resolves once the microphone is live. */
  async start(): Promise<void> {
    this.assertUsable();
    if (!this.isSupported) {
      throw new VoiceCaptureError(
        'unsupported',
        'Speech recognition is not available on this device.'
      );
    }
    if (this.current.state !== 'idle') {
      throw new VoiceCaptureError(
        'invalid_state',
        'Voice capture is already active.'
      );
    }
    this.ensureSubscription();
    this.active = true;
    this.publish({ ...idleSnapshot, state: 'requestingPermission' });
    try {
      await requireNativeModule().voiceCaptureStart(
        this.sessionId,
        this.locale
      );
    } catch (error) {
      this.active = false;
      this.publish(idleSnapshot);
      throw toVoiceCaptureError(error);
    }
  }

  /** Stops recording and resolves with the transcript. */
  async stop(): Promise<VoiceCaptureResult> {
    this.assertUsable();
    this.active = false;
    if (this.current.state === 'idle') {
      const ended = this.current.error;
      if (ended) {
        this.publish(idleSnapshot);
        throw new VoiceCaptureError(ended.code, ended.message);
      }
      throw new VoiceCaptureError(
        'invalid_state',
        'Voice capture is not recording.'
      );
    }
    this.publish({ ...this.current, state: 'processing' });
    try {
      const raw = await requireNativeModule().voiceCaptureStop(this.sessionId);
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
      this.publish(idleSnapshot);
    }
  }

  /** Discards the active capture without a result. */
  cancel(): void {
    this.active = false;
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
        if (this.current.state === 'idle' && update.state === 'idle') return;
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
