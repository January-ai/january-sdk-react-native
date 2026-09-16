import { describe, expect, it, jest } from '@jest/globals';

type Listener = (update: Record<string, unknown>) => void;
const mockListeners = new Set<Listener>();

jest.mock('../NativeJanuaryReactNative', () => ({
  __esModule: true,
  default: {
    voiceCaptureIsSupported: jest.fn(() => true),
    voiceCaptureStart: jest.fn(async () => '{}'),
    voiceCaptureStop: jest.fn(async () =>
      JSON.stringify({ transcript: ' two eggs ', durationMs: 1800 })
    ),
    voiceCaptureCancel: jest.fn(),
    voiceCaptureDispose: jest.fn(),
    onVoiceCaptureUpdate: jest.fn((listener: Listener) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    }),
  },
}));

import NativeJanuaryReactNative from '../NativeJanuaryReactNative';
import { VoiceCaptureError, VoiceCaptureSession } from '../voice-capture';

const native = jest.mocked(NativeJanuaryReactNative!);

function emit(sessionId: string, update: Record<string, unknown>) {
  for (const listener of mockListeners) listener({ sessionId, ...update });
}

describe('VoiceCaptureSession', () => {
  it('publishes native updates and returns a trimmed transcript', async () => {
    const session = new VoiceCaptureSession({ locale: 'en-US' });
    const states: string[] = [];
    session.subscribe((snapshot) => states.push(snapshot.state));
    expect(session.isSupported).toBe(true);

    await session.start();
    expect(native.voiceCaptureStart).toHaveBeenCalledWith(
      expect.stringMatching(/^january-voice-/),
      'en-US'
    );
    const sessionId = native.voiceCaptureStart.mock.calls[0]![0];
    emit(sessionId, {
      state: 'recording',
      audioLevel: 0.42,
      durationMs: 900,
      partialTranscript: 'two',
    });
    expect(session.snapshot).toEqual({
      state: 'recording',
      audioLevel: 0.42,
      durationMs: 900,
      partialTranscript: 'two',
    });

    const result = await session.stop();
    expect(result).toEqual({ transcript: 'two eggs', durationMs: 1800 });
    // Consecutive duplicates are level/duration updates within one state.
    expect(states.filter((state, i) => state !== states[i - 1])).toEqual([
      'idle',
      'requestingPermission',
      'recording',
      'processing',
      'idle',
    ]);
    session.dispose();
    expect(native.voiceCaptureDispose).toHaveBeenCalledWith(sessionId);
  });

  it('ignores updates for other sessions and maps native errors to stable codes', async () => {
    native.voiceCaptureStart.mockRejectedValueOnce(
      Object.assign(new Error('Microphone access is required.'), {
        code: 'permission_denied',
      })
    );
    const session = new VoiceCaptureSession();
    emit('someone-else', { state: 'recording', audioLevel: 1, durationMs: 1 });
    expect(session.snapshot.state).toBe('idle');

    await expect(session.start()).rejects.toMatchObject({
      name: 'VoiceCaptureError',
      code: 'permission_denied',
    });
    expect(session.snapshot.state).toBe('idle');
    await expect(session.stop()).rejects.toBeInstanceOf(VoiceCaptureError);
    session.dispose();
    await expect(session.start()).rejects.toMatchObject({
      code: 'invalid_state',
    });
  });

  it('a recognizer error mid-capture returns to idle with the error and rejects the next stop', async () => {
    const session = new VoiceCaptureSession();
    await session.start();
    const sessionId = native.voiceCaptureStart.mock.calls.at(-1)![0];
    emit(sessionId, {
      state: 'idle',
      audioLevel: 0,
      durationMs: 1200,
      partialTranscript: '',
      errorCode: 'no_match',
      errorMessage: 'No speech was recognized.',
    });
    expect(session.snapshot.state).toBe('idle');
    expect(session.snapshot.error).toEqual({
      code: 'no_match',
      message: 'No speech was recognized.',
    });
    await expect(session.stop()).rejects.toMatchObject({ code: 'no_match' });
    expect(session.snapshot.error).toBeUndefined();
    session.dispose();
  });

  it('stop is only accepted while recording; a second stop during processing is rejected', async () => {
    const session = new VoiceCaptureSession();
    const first = session.start();
    await expect(session.stop()).rejects.toMatchObject({
      code: 'invalid_state',
    });
    await first;
    expect(session.snapshot.state).toBe('recording');
    const stopping = session.stop();
    expect(session.snapshot.state).toBe('processing');
    await expect(session.stop()).rejects.toMatchObject({
      code: 'invalid_state',
    });
    await expect(stopping).resolves.toEqual({
      transcript: 'two eggs',
      durationMs: 1800,
    });
    session.dispose();
  });

  it('a transcript the recognizer finalized on its own is kept until stop() collects it', async () => {
    const session = new VoiceCaptureSession();
    await session.start();
    const sessionId = native.voiceCaptureStart.mock.calls.at(-1)![0];
    native.voiceCaptureStop.mockClear();
    emit(sessionId, {
      state: 'idle',
      audioLevel: 0,
      durationMs: 2400,
      partialTranscript: '',
      transcript: ' one banana ',
      errorCode: null,
      errorMessage: null,
    });
    expect(session.snapshot.state).toBe('idle');
    expect(session.snapshot.result).toEqual({
      transcript: 'one banana',
      durationMs: 2400,
    });
    await expect(session.stop()).resolves.toEqual({
      transcript: 'one banana',
      durationMs: 2400,
    });
    expect(native.voiceCaptureStop).not.toHaveBeenCalled();
    expect(session.snapshot.result).toBeUndefined();
    await expect(session.stop()).rejects.toMatchObject({
      code: 'invalid_state',
    });
    session.dispose();
  });

  it('cancelling while start is in flight releases the recognizer and rejects start', async () => {
    let finishStart: (value: string) => void = () => undefined;
    native.voiceCaptureStart.mockImplementationOnce(
      () => new Promise<string>((resolve) => (finishStart = resolve))
    );
    native.voiceCaptureCancel.mockClear();
    const session = new VoiceCaptureSession();
    const starting = session.start();
    expect(session.snapshot.state).toBe('requestingPermission');
    session.cancel();
    expect(session.snapshot.state).toBe('idle');
    finishStart('{}');
    await expect(starting).rejects.toMatchObject({ code: 'cancelled' });
    expect(native.voiceCaptureCancel).toHaveBeenCalled();
    expect(session.snapshot.state).toBe('idle');
    session.dispose();
  });

  it('cancel releases the native capture and returns to idle', async () => {
    const session = new VoiceCaptureSession();
    await session.start();
    const sessionId = native.voiceCaptureStart.mock.calls.at(-1)![0];
    session.cancel();
    expect(native.voiceCaptureCancel).toHaveBeenCalled();
    expect(session.snapshot.state).toBe('idle');
    // A native update that was already queued must not revive the session.
    emit(sessionId, {
      state: 'recording',
      audioLevel: 0.5,
      durationMs: 300,
      partialTranscript: '',
    });
    expect(session.snapshot.state).toBe('idle');
    session.dispose();
  });
});
