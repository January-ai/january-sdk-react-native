import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  FoodScan,
  JanuaryClient,
  NutritionFacts,
} from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
import { analyzeFixturePhoto, correctFixtureScan } from './e2eFixtures';

const sampleMealURL =
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85';

interface ScanScreenProps {
  client: JanuaryClient;
  configured: boolean;
  fixtures: boolean;
  onSettings: () => void;
}

export function ScanScreen({
  client,
  configured,
  fixtures,
  onSettings,
}: ScanScreenProps) {
  const [image, setImage] = useState<string>();
  const [result, setResult] = useState<FoodScan>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [correction, setCorrection] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [retryAction, setRetryAction] = useState<'analyze' | 'correct'>();

  async function chooseImage(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is required to photograph a meal.');
        return;
      }
    }
    const response =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            base64: true,
            mediaTypes: ['images'],
            quality: 0.82,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            base64: true,
            mediaTypes: ['images'],
            quality: 0.82,
          });
    if (response.canceled) return;
    const asset = response.assets[0];
    if (!asset) return;
    setImage(
      asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri
    );
    setResult(undefined);
    setError(undefined);
  }

  async function analyze() {
    if (!image) return;
    setLoading(true);
    setError(undefined);
    setRetryAction(undefined);
    try {
      const scan = fixtures
        ? await analyzeFixturePhoto(image)
        : await client.foodAnalysis.analyzePhoto({ image });
      setResult(scan);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Meal analysis failed.'
      );
      setRetryAction('analyze');
    } finally {
      setLoading(false);
    }
  }

  async function submitCorrection() {
    if (!result || !correction.trim()) return;
    setCorrecting(true);
    setError(undefined);
    setRetryAction(undefined);
    try {
      const corrected = fixtures
        ? await correctFixtureScan(correction)
        : await client.foodAnalysis.correct({
            analysis: result,
            instruction: correction,
          });
      setResult(corrected);
      setCorrection('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Meal correction failed.'
      );
      setRetryAction('correct');
    } finally {
      setCorrecting(false);
    }
  }

  function reset() {
    setImage(undefined);
    setResult(undefined);
    setCorrection('');
    setError(undefined);
    setRetryAction(undefined);
  }

  return (
    <View style={sharedStyles.screen} testID="scan-screen">
      <ScreenHeader onSettings={onSettings} title="Scan a meal" />
      <ScrollView contentContainerStyle={sharedStyles.content}>
        {!result ? (
          <>
            <View style={sharedStyles.card} testID="scan-guide">
              <View style={styles.guideHeading}>
                <View style={styles.guideIcon}>
                  <MaterialCommunityIcons
                    color={palette.green}
                    name="camera-outline"
                    size={24}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={sharedStyles.cardTitle}>
                    Photograph the full meal
                  </Text>
                  <Text style={sharedStyles.body}>
                    Keep every food visible and use natural light when possible.
                  </Text>
                </View>
              </View>
              <Instruction number="1" text="Frame the entire plate" />
              <Instruction
                number="2"
                text="Avoid hands, menus, and packaging glare"
              />
              <Instruction
                number="3"
                text="Review and correct the detected foods"
              />
            </View>

            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.preview}
                testID="scan-preview"
              />
            ) : (
              <View style={styles.placeholder}>
                <MaterialCommunityIcons
                  color={palette.subdued}
                  name="image-outline"
                  size={38}
                />
                <Text style={styles.placeholderText}>
                  Choose a meal photo to begin
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <ChoiceButton
                icon="camera-outline"
                label="Camera"
                onPress={() => chooseImage('camera').catch(() => undefined)}
                testID="scan-camera"
              />
              <ChoiceButton
                icon="image-multiple-outline"
                label="Photos"
                onPress={() => chooseImage('library').catch(() => undefined)}
                testID="scan-library"
              />
              <ChoiceButton
                icon="silverware-fork-knife"
                label="Sample meal"
                onLongPress={
                  fixtures
                    ? () => {
                        setImage(`${sampleMealURL}#retry`);
                        setError(undefined);
                      }
                    : undefined
                }
                onPress={() => {
                  setImage(sampleMealURL);
                  setError(undefined);
                }}
                testID="scan-sample"
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!configured || !image || loading}
              onPress={() => analyze().catch(() => undefined)}
              style={({ pressed }) => [
                sharedStyles.primaryButton,
                (!configured || !image || loading) && sharedStyles.disabled,
                pressed && sharedStyles.pressed,
              ]}
              testID="scan-analyze"
            >
              {loading ? (
                <View collapsable={false} testID="scan-loading">
                  <ActivityIndicator color={palette.paper} />
                </View>
              ) : (
                <Text style={sharedStyles.primaryText}>Analyze meal</Text>
              )}
            </Pressable>
          </>
        ) : (
          <View style={styles.resultStack} testID="scan-results">
            <Text style={sharedStyles.label}>Analysis complete</Text>
            <Text accessibilityRole="header" style={styles.resultTitle}>
              {result.mealName ?? 'Scanned meal'}
            </Text>
            <MacroStrip nutrients={result.totalNutrients} />
            <View style={sharedStyles.card}>
              <Text style={sharedStyles.cardTitle}>Detected foods</Text>
              {result.detections.map((detection, index) => (
                <View key={`${detection.food.id ?? index}`}>
                  {index > 0 ? <View style={sharedStyles.divider} /> : null}
                  <View style={styles.detectionRow}>
                    <View style={styles.flex}>
                      <Text style={styles.detectionName}>
                        {detection.food.name ?? 'Unnamed food'}
                      </Text>
                      <Text style={styles.detectionMeta}>
                        {detection.food.nutrients.calories?.value != null
                          ? `${Math.round(detection.food.nutrients.calories.value)} cal`
                          : 'Nutrition detected'}
                      </Text>
                    </View>
                    {detection.confidenceScore ? (
                      <Text style={styles.confidence}>
                        {detection.confidenceScore}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
            <View style={sharedStyles.card}>
              <Text style={sharedStyles.cardTitle}>Correct the result</Text>
              <Text style={sharedStyles.body}>
                Tell January what should change while keeping the photo
                analysis.
              </Text>
              <TextInput
                accessibilityLabel="Correction instructions"
                multiline
                onChangeText={setCorrection}
                placeholder="For example: This was lentils, not beans"
                placeholderTextColor={palette.subdued}
                style={[sharedStyles.input, styles.correctionInput]}
                testID="scan-correction-input"
                value={correction}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!correction.trim() || correcting}
                onPress={() => submitCorrection().catch(() => undefined)}
                style={[
                  sharedStyles.secondaryButton,
                  (!correction.trim() || correcting) && sharedStyles.disabled,
                ]}
                testID="scan-correction-submit"
              >
                {correcting ? (
                  <View collapsable={false} testID="scan-correction-loading">
                    <ActivityIndicator color={palette.ink} />
                  </View>
                ) : (
                  <Text style={sharedStyles.secondaryText}>
                    Submit correction
                  </Text>
                )}
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={reset}
              style={sharedStyles.primaryButton}
              testID="scan-another"
            >
              <Text style={sharedStyles.primaryText}>Scan another meal</Text>
            </Pressable>
          </View>
        )}

        {error ? (
          <View
            accessibilityRole="alert"
            style={sharedStyles.error}
            testID="scan-error"
          >
            <Text style={sharedStyles.errorTitle}>
              January couldn’t complete the request
            </Text>
            <Text style={sharedStyles.errorText}>{error}</Text>
            {retryAction ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  (retryAction === 'analyze'
                    ? analyze()
                    : submitCorrection()
                  ).catch(() => undefined)
                }
                style={sharedStyles.secondaryButton}
                testID="scan-retry"
              >
                <Text style={sharedStyles.secondaryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ScreenHeader({
  onSettings,
  title,
}: {
  onSettings: () => void;
  title: string;
}) {
  return (
    <View style={sharedStyles.header}>
      <Text accessibilityRole="header" style={sharedStyles.title}>
        {title}
      </Text>
      <Pressable
        accessibilityLabel="Open settings"
        accessibilityRole="button"
        onPress={onSettings}
        style={sharedStyles.iconButton}
      >
        <MaterialCommunityIcons
          color={palette.ink}
          name="tune-variant"
          size={22}
        />
      </Pressable>
    </View>
  );
}

function Instruction({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.instruction}>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

function ChoiceButton({
  icon,
  label,
  onLongPress,
  onPress,
  testID,
}: {
  icon: 'camera-outline' | 'image-multiple-outline' | 'silverware-fork-knife';
  label: string;
  onLongPress?: () => void;
  onPress: () => void;
  testID: string;
}) {
  const handledLongPress = useRef(false);
  return (
    <Pressable
      accessibilityRole="button"
      delayLongPress={350}
      onLongPress={() => {
        handledLongPress.current = true;
        onLongPress?.();
      }}
      onPress={() => {
        if (handledLongPress.current) {
          handledLongPress.current = false;
          return;
        }
        onPress();
      }}
      style={({ pressed }) => [styles.choice, pressed && sharedStyles.pressed]}
      testID={testID}
    >
      <MaterialCommunityIcons color={palette.green} name={icon} size={22} />
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

function MacroStrip({ nutrients }: { nutrients: NutritionFacts }) {
  const values = [
    ['Calories', nutrients.calories, 'cal'],
    ['Protein', nutrients.protein, 'g'],
    ['Carbs', nutrients.carbohydrates, 'g'],
    ['Fat', nutrients.totalFat, 'g'],
  ] as const;
  return (
    <View style={styles.macros}>
      {values.map(([label, value, fallbackUnit]) => (
        <View key={label} style={styles.macro}>
          <Text style={styles.macroValue}>
            {value ? Math.round(value.value) : '—'}
          </Text>
          <Text style={styles.macroUnit}>{value?.unit ?? fallbackUnit}</Text>
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  guideHeading: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  guideIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.controlStrong,
  },
  numberText: { color: palette.ink, fontSize: 12, fontWeight: '800' },
  instructionText: { flex: 1, color: palette.body, fontSize: 14 },
  preview: { width: '100%', height: 240, borderRadius: 24 },
  placeholder: {
    height: 210,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.border,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: palette.control,
  },
  placeholderText: { color: palette.muted, fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 8 },
  choice: {
    minHeight: 72,
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: palette.surface,
  },
  choiceText: { color: palette.ink, fontSize: 12, fontWeight: '700' },
  resultStack: { gap: 16 },
  resultTitle: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  macros: {
    padding: 16,
    borderRadius: 22,
    flexDirection: 'row',
    backgroundColor: palette.targetBand,
  },
  macro: { flex: 1, alignItems: 'center' },
  macroValue: { color: palette.ink, fontSize: 20, fontWeight: '800' },
  macroUnit: { color: palette.muted, fontSize: 11 },
  macroLabel: { color: palette.muted, fontSize: 11, fontWeight: '600' },
  detectionRow: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectionName: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  detectionMeta: { color: palette.muted, fontSize: 13, marginTop: 3 },
  confidence: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    color: palette.green,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    backgroundColor: palette.targetBand,
  },
  correctionInput: { minHeight: 92, paddingTop: 14, textAlignVertical: 'top' },
});
