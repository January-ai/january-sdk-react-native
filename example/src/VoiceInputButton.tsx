import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  VoiceCaptureError,
  VoiceCaptureSession,
  type VoiceCaptureSnapshot,
} from '@januaryai/react-native';

import { palette } from './demoTheme';

interface VoiceInputButtonProps {
  /** Called with the recognized text when the user stops recording. */
  onTranscript: (transcript: string) => void;
  /** Called with a short message when capture fails. */
  onError?: (message: string) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * A microphone control backed by the SDK's VoiceCaptureSession. Tap to start,
 * tap again to stop and receive the transcript. Hidden when the device has no
 * speech recognizer.
 */
export function VoiceInputButton({
  onTranscript,
  onError,
  disabled,
  testID = 'voice-input',
}: VoiceInputButtonProps) {
  const session = useMemo(() => new VoiceCaptureSession(), []);
  const [snapshot, setSnapshot] = useState<VoiceCaptureSnapshot>(
    session.snapshot
  );
  // The callbacks change on every parent render; keep the session for the
  // component's whole life and read the latest callbacks through refs.
  const callbacks = useRef({ onError, onTranscript });
  callbacks.current = { onError, onTranscript };

  useEffect(() => {
    let lastError: string | undefined;
    const unsubscribe = session.subscribe((next) => {
      setSnapshot(next);
      if (next.error && next.error.message !== lastError) {
        lastError = next.error.message;
        callbacks.current.onError?.(
          next.error.code === 'no_match'
            ? 'No speech was recognized. Try again.'
            : next.error.message
        );
      }
      if (!next.error) lastError = undefined;
      if (next.result) {
        // Android ends a capture on its own after a pause; collect that transcript.
        session
          .stop()
          .then((result) => {
            if (result.transcript)
              callbacks.current.onTranscript(result.transcript);
          })
          .catch(() => undefined);
      }
    });
    return () => {
      unsubscribe();
      session.dispose();
    };
  }, [session]);

  if (!session.isSupported) return null;

  const recording = snapshot.state === 'recording';
  const busy =
    snapshot.state === 'requestingPermission' ||
    snapshot.state === 'processing';

  async function toggle() {
    try {
      if (recording) {
        const result = await session.stop();
        if (result.transcript)
          callbacks.current.onTranscript(result.transcript);
        else
          callbacks.current.onError?.('No speech was recognized. Try again.');
        return;
      }
      await session.start();
    } catch (error) {
      const report = callbacks.current.onError;
      if (error instanceof VoiceCaptureError && error.code === 'no_match') {
        report?.('No speech was recognized. Try again.');
      } else if (error instanceof VoiceCaptureError) {
        report?.(error.message);
      } else {
        report?.('Voice input is unavailable right now.');
      }
    }
  }

  return (
    <View style={styles.row}>
      {recording ? (
        <View style={styles.meter} testID={`${testID}-meter`}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${Math.max(8, Math.round(snapshot.audioLevel * 100))}%`,
              },
            ]}
          />
        </View>
      ) : null}
      {recording ? (
        <Text style={styles.duration}>
          {Math.floor(snapshot.durationMs / 1000)}s
        </Text>
      ) : null}
      <Pressable
        accessibilityLabel={recording ? 'Stop voice input' : 'Use voice input'}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || busy, selected: recording }}
        disabled={disabled || busy}
        hitSlop={10}
        onPress={() => {
          toggle().catch(() => undefined);
        }}
        style={[styles.button, recording ? styles.buttonRecording : null]}
        testID={testID}
      >
        <MaterialCommunityIcons
          color={recording ? '#FFFFFF' : palette.muted}
          name={recording ? 'stop' : busy ? 'dots-horizontal' : 'microphone'}
          size={21}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meter: {
    width: 44,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.divider,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: palette.green },
  duration: {
    fontSize: 12,
    color: palette.muted,
    fontVariant: ['tabular-nums'],
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: { backgroundColor: palette.rustText },
});
