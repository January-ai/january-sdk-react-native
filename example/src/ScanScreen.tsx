import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  FoodScan,
  JanuaryClient,
  NutritionFacts,
} from '@januaryai/react-native';

import { palette, serifFont, sharedStyles } from './demoTheme';
import { SectionLabel } from './designSystem';
import { analyzeFixturePhoto, correctFixtureScan } from './e2eFixtures';

const sampleMealURL =
  'https://raw.githubusercontent.com/January-ai/january-sdk-android/main/sdk/src/test/resources/fixtures/photo-scanning/burger-and-fries.png';

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
  const [showUrl, setShowUrl] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

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
    try {
      const scan = fixtures
        ? await analyzeFixturePhoto(image)
        : await client.foodAnalysis.analyzePhoto({ image });
      setResult(scan);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Meal analysis failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImage(undefined);
    setResult(undefined);
    setError(undefined);
  }

  return (
    <View style={sharedStyles.screen} testID="scan-screen">
      <ScreenHeader onSettings={onSettings} />
      <ScrollView
        contentContainerStyle={styles.content}
        style={sharedStyles.scroll}
      >
        {!image ? (
          <>
            <View style={styles.introCard} testID="scan-guide">
              <View style={styles.introIcon}>
                <MaterialIcons
                  color={palette.green}
                  name="photo-camera"
                  size={21}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.introTitle}>
                  Photograph the entire meal
                </Text>
                <Text style={styles.introBody}>
                  January identifies foods, servings, and nutrition — then
                  estimates glucose impact.
                </Text>
              </View>
            </View>
            <SourceButton
              icon="photo-camera"
              label="Take photo"
              onPress={() => chooseImage('camera').catch(() => undefined)}
              primary
              testID="scan-camera"
            />
            <SourceButton
              icon="image"
              label="Choose from library"
              onPress={() => chooseImage('library').catch(() => undefined)}
              testID="scan-library"
            />
            <SectionLabel>Other ways</SectionLabel>
            <View style={styles.otherWays}>
              <SourceButton
                compact
                icon="restaurant"
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
              <SourceButton
                compact
                icon="link"
                label="Image URL"
                onPress={() => setShowUrl(true)}
                testID="scan-image-url"
              />
            </View>
          </>
        ) : (
          <>
            <Image
              source={{ uri: image }}
              style={styles.preview}
              testID="scan-preview"
            />
            <View style={styles.photoActions}>
              <Pressable
                onPress={() => chooseImage('library').catch(() => undefined)}
                style={[styles.photoButton, styles.photoButtonFilled]}
                testID="scan-change"
              >
                <Text style={styles.photoButtonText}>Change photo</Text>
              </Pressable>
              <Pressable
                onPress={reset}
                style={styles.photoButton}
                testID="scan-remove"
              >
                <Text style={styles.photoButtonText}>Remove</Text>
              </Pressable>
            </View>
            <Pressable
              disabled={!configured || loading}
              onPress={() => analyze().catch(() => undefined)}
              style={[
                sharedStyles.primaryButton,
                !configured && sharedStyles.disabled,
              ]}
              testID={loading ? 'scan-loading' : 'scan-analyze'}
            >
              {loading ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator color={palette.paper} size="small" />
                  <Text style={sharedStyles.primaryText}>
                    Analyzing this meal…
                  </Text>
                </View>
              ) : (
                <Text style={sharedStyles.primaryText}>Analyze meal</Text>
              )}
            </Pressable>
            {loading ? (
              <Text style={styles.loadingCopy}>
                Complex meals can take a little longer. You can leave this
                screen while the request completes.
              </Text>
            ) : null}
          </>
        )}

        {error ? (
          <RequestError
            message={error}
            onRetry={() => analyze().catch(() => undefined)}
            testID="scan-error"
          />
        ) : null}
      </ScrollView>

      <ImageUrlSheet
        initialValue={
          image?.startsWith('http') ? (image.split('#')[0] ?? '') : ''
        }
        onClose={() => setShowUrl(false)}
        onUse={(value) => {
          setImage(value);
          setError(undefined);
          setShowUrl(false);
        }}
        visible={showUrl}
      />
      <MealAnalysisSheet
        image={image}
        onClose={() => setResult(undefined)}
        onCorrect={() => setShowCorrection(true)}
        onReset={reset}
        result={showCorrection ? undefined : result}
      />
      <CorrectionSheet
        fixtures={fixtures}
        initial={result}
        onClose={() => setShowCorrection(false)}
        onCorrected={(corrected) => {
          setResult(corrected);
          setShowCorrection(false);
        }}
        visible={showCorrection}
      />
    </View>
  );
}

function ScreenHeader({ onSettings }: { onSettings: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerActions}>
        <View />
        <Pressable
          onPress={onSettings}
          style={sharedStyles.iconButton}
          testID="settings-button"
        >
          <MaterialCommunityIcons
            color={palette.ink}
            name="cog-outline"
            size={25}
          />
        </Pressable>
      </View>
      <Text style={styles.headerTitle}>Scan a meal</Text>
    </View>
  );
}

function SourceButton({
  compact,
  icon,
  label,
  onLongPress,
  onPress,
  primary,
  testID,
}: {
  compact?: boolean;
  icon: 'photo-camera' | 'image' | 'restaurant' | 'link';
  label: string;
  onLongPress?: () => void;
  onPress: () => void;
  primary?: boolean;
  testID: string;
}) {
  const handledLongPress = useRef(false);
  return (
    <Pressable
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
      style={[
        styles.sourceButton,
        compact && styles.sourceButtonCompact,
        primary && styles.sourceButtonPrimary,
      ]}
      testID={testID}
    >
      <MaterialIcons
        color={primary ? palette.paper : palette.ink}
        name={icon}
        size={19}
      />
      <Text style={[styles.sourceText, primary && styles.sourceTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SheetFrame({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.sheet, { paddingTop: insets.top + 42 }]}>
      <View style={[styles.handle, { top: insets.top + 16 }]} />
      <View style={styles.sheetHeader}>
        <Pressable
          accessibilityLabel={`Close ${title}`}
          onPress={onClose}
          style={sharedStyles.iconButton}
        >
          <MaterialIcons color={palette.ink} name="close" size={24} />
        </Pressable>
        <Text style={styles.sheetTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {children}
    </View>
  );
}

function ImageUrlSheet({
  initialValue,
  onClose,
  onUse,
  visible,
}: {
  initialValue: string;
  onClose: () => void;
  onUse: (value: string) => void;
  visible: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const valid = /^https?:\/\/[^\s]+$/i.test(value.trim());
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <SheetFrame onClose={onClose} title="Use image URL">
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            style={styles.sheetScroll}
          >
            <View style={sharedStyles.card}>
              <View style={styles.publicImageRow}>
                <MaterialIcons color={palette.green} name="link" size={22} />
                <Text style={styles.greenTitle}>Public image</Text>
              </View>
              <Text style={sharedStyles.body}>
                Paste a direct HTTPS link to a meal photo.
              </Text>
            </View>
            <SectionLabel>Image address</SectionLabel>
            <TextInput
              autoCapitalize="none"
              onChangeText={setValue}
              placeholder="https://example.com/meal.jpg"
              placeholderTextColor={palette.subdued}
              style={sharedStyles.input}
              testID="image-url-input"
              value={value}
            />
            <Text style={styles.loadingCopy}>
              The server must be able to download the image without signing in.
            </Text>
            <Pressable
              disabled={!valid}
              onPress={() => onUse(value.trim())}
              style={[
                sharedStyles.primaryButton,
                !valid && sharedStyles.disabled,
              ]}
              testID="image-url-use"
            >
              <MaterialIcons color={palette.paper} name="download" size={22} />
              <Text style={sharedStyles.primaryText}>Use image URL</Text>
            </Pressable>
          </ScrollView>
        </SheetFrame>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MealAnalysisSheet({
  image,
  onClose,
  onCorrect,
  onReset,
  result,
}: {
  image?: string;
  onClose: () => void;
  onCorrect: () => void;
  onReset: () => void;
  result?: FoodScan;
}) {
  if (!result) return null;
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <SheetFrame onClose={onClose} title="Meal analysis">
          <ScrollView
            contentContainerStyle={styles.analysisContent}
            style={styles.sheetScroll}
            testID="scan-results"
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.analysisImage} />
            ) : null}
            <Text style={styles.analysisTitle}>
              {result.mealName ?? 'Meal analysis'}
            </Text>
            <MacroGrid nutrients={result.totalNutrients} />
            <NutritionCard nutrients={result.totalNutrients} />
            {result.detections.length ? (
              <Text style={styles.detectedHeading}>Detected foods</Text>
            ) : null}
            {result.detections.map((detection, index) => (
              <View
                key={`${detection.food.id ?? index}`}
                style={sharedStyles.card}
              >
                <View style={styles.detectionHeading}>
                  <View style={styles.flex}>
                    <Text style={styles.detectionName}>
                      {detection.food.name ?? 'Unnamed food'}
                    </Text>
                    {detection.food.brandName ? (
                      <Text style={styles.detectionBrand}>
                        {detection.food.brandName}
                      </Text>
                    ) : null}
                  </View>
                  {detection.confidenceScore ? (
                    <Text style={styles.confidence}>
                      {detection.confidenceScore} confidence
                    </Text>
                  ) : null}
                </View>
                <MacroGrid bare nutrients={detection.food.nutrients} />
              </View>
            ))}
            <Pressable
              onPress={onCorrect}
              style={sharedStyles.primaryButton}
              testID="scan-correct"
            >
              <Text style={sharedStyles.primaryText}>Correct result</Text>
            </Pressable>
            <Pressable
              onPress={onReset}
              style={sharedStyles.secondaryButton}
              testID="scan-another"
            >
              <Text style={sharedStyles.secondaryText}>Scan another meal</Text>
            </Pressable>
          </ScrollView>
        </SheetFrame>
      </View>
    </Modal>
  );
}

function CorrectionSheet({
  fixtures,
  initial,
  onClose,
  onCorrected,
  visible,
}: {
  fixtures: boolean;
  initial?: FoodScan;
  onClose: () => void;
  onCorrected: (scan: FoodScan) => void;
  visible: boolean;
}) {
  const [mealName, setMealName] = useState(initial?.mealName ?? '');
  const [instruction, setInstruction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string>();
  useEffect(() => {
    if (visible && initial) setMealName(initial.mealName ?? '');
  }, [initial, visible]);
  if (!initial) return null;

  const submit = async () => {
    if (!instruction.trim() || submitting) return;
    setSubmitting(true);
    setLocalError(undefined);
    try {
      const corrected = fixtures
        ? await correctFixtureScan(instruction)
        : { ...initial, mealName: mealName.trim() || 'Meal' };
      onCorrected(corrected);
      setInstruction('');
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : 'Meal correction failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitAndDismiss = () => {
    Keyboard.dismiss();
    submit().catch(() => undefined);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <SheetFrame onClose={onClose} title="Correct result">
          <ScrollView
            contentContainerStyle={styles.correctionContent}
            keyboardShouldPersistTaps="handled"
            style={styles.sheetScroll}
          >
            <SectionLabel>Meal</SectionLabel>
            <TextInput
              onChangeText={setMealName}
              style={styles.filledInput}
              testID="correction-meal-name"
              value={mealName}
            />
            <SectionLabel>Current detections</SectionLabel>
            <View style={styles.detectionsCard}>
              {initial.detections.map((detection, index) => (
                <Text
                  key={`${detection.food.id ?? index}`}
                  style={styles.currentDetection}
                >
                  {detection.food.name ?? 'Unnamed food'}
                </Text>
              ))}
            </View>
            <SectionLabel>What should change?</SectionLabel>
            <TextInput
              multiline
              onChangeText={setInstruction}
              onSubmitEditing={submitAndDismiss}
              placeholder="Describe the correction"
              placeholderTextColor={palette.subdued}
              returnKeyType="done"
              style={styles.correctionInput}
              submitBehavior="blurAndSubmit"
              testID="scan-correction-input"
              value={instruction}
            />
            <Text style={styles.loadingCopy}>
              For example: The oatmeal was steel-cut, about 2 cups, and there
              was no honey.
            </Text>
            {localError ? (
              <RequestError
                message={localError}
                onRetry={() => submit().catch(() => undefined)}
                testID="scan-correction-error"
              />
            ) : null}
            <Pressable
              disabled={!instruction.trim() || submitting}
              onPress={submitAndDismiss}
              style={[
                sharedStyles.primaryButton,
                (!instruction.trim() || submitting) && sharedStyles.disabled,
              ]}
              testID={
                submitting
                  ? 'scan-correction-loading'
                  : 'scan-correction-submit'
              }
            >
              {submitting ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator color={palette.paper} size="small" />
                  <Text style={sharedStyles.primaryText}>
                    Submitting correction…
                  </Text>
                </View>
              ) : (
                <Text style={sharedStyles.primaryText}>Submit correction</Text>
              )}
            </Pressable>
          </ScrollView>
        </SheetFrame>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MacroGrid({
  nutrients,
  bare,
}: {
  nutrients: NutritionFacts;
  bare?: boolean;
}) {
  const values = [
    ['Calories', nutrients.calories, 'cal'],
    ['Protein', nutrients.protein, 'g'],
    ['Carbs', nutrients.carbohydrates, 'g'],
    ['Fat', nutrients.totalFat, 'g'],
  ] as const;
  return (
    <View style={[styles.macros, bare && styles.macrosBare]}>
      {values.map(([label, value, fallbackUnit]) => (
        <View key={label} style={styles.macroCell}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>
            {value ? formatNumber(value.value) : '—'}{' '}
            <Text style={styles.macroUnit}>{value?.unit ?? fallbackUnit}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

function NutritionCard({ nutrients }: { nutrients: NutritionFacts }) {
  const rows = [
    ['Fiber', nutrients.fiber],
    ['Sodium', nutrients.sodium],
  ] as const;
  if (!rows.some(([, value]) => value)) return null;
  return (
    <View style={sharedStyles.card}>
      {rows.map(([label, value], index) =>
        value ? (
          <View key={label}>
            {index > 0 ? <View style={sharedStyles.divider} /> : null}
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionText}>{label}</Text>
              <Text style={styles.nutritionText}>
                {formatNumber(value.value)} {value.unit}
              </Text>
            </View>
          </View>
        ) : null
      )}
    </View>
  );
}

function RequestError({
  message,
  onRetry,
  testID,
}: {
  message: string;
  onRetry: () => void;
  testID: string;
}) {
  return (
    <View style={styles.errorCard} testID={testID}>
      <View style={styles.errorHeading}>
        <MaterialIcons
          color={palette.rustText}
          name="error-outline"
          size={21}
        />
        <Text style={styles.errorTitle}>
          January couldn’t complete the request
        </Text>
      </View>
      <Text style={styles.errorBody}>{message}</Text>
      <Text style={styles.technical}>Technical details　›</Text>
      <Pressable onPress={onRetry} testID={`${testID}-retry`}>
        <Text style={styles.retry}>Try again</Text>
      </Pressable>
    </View>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 112 },
  headerActions: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    paddingHorizontal: 16,
    color: palette.ink,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  introCard: {
    minHeight: 148,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: palette.surface,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  introTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 23,
    lineHeight: 28,
  },
  introBody: {
    marginTop: 5,
    color: palette.body,
    fontSize: 14,
    lineHeight: 20,
  },
  sourceButton: {
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: palette.control,
  },
  sourceButtonPrimary: { backgroundColor: palette.ink },
  sourceButtonCompact: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  sourceText: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  sourceTextPrimary: { color: palette.paper },
  otherWays: { flexDirection: 'row', gap: 10 },
  preview: { width: '100%', height: 240, borderRadius: 28 },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoButton: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  photoButtonFilled: { borderWidth: 0, backgroundColor: palette.control },
  photoButtonText: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  buttonLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingCopy: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29,26,20,0.46)',
  },
  sheet: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.paper,
  },
  handle: {
    position: 'absolute',
    left: '50%',
    width: 32,
    height: 5,
    marginLeft: -16,
    borderRadius: 3,
    backgroundColor: palette.body,
  },
  sheetHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 44 },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 20,
  },
  sheetScroll: { flex: 1 },
  publicImageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greenTitle: { color: palette.green, fontSize: 16, fontWeight: '700' },
  analysisContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  analysisImage: { width: '100%', aspectRatio: 1, borderRadius: 28 },
  analysisTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  macros: {
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: palette.surface,
  },
  macrosBare: { paddingHorizontal: 0, paddingVertical: 4 },
  macroCell: { width: '50%', minHeight: 58, gap: 4 },
  macroLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  macroValue: { color: palette.ink, fontSize: 18, fontWeight: '600' },
  macroUnit: { color: palette.body, fontSize: 12, fontWeight: '400' },
  nutritionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionText: { color: palette.body, fontSize: 15 },
  detectedHeading: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  detectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detectionName: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  detectionBrand: { marginTop: 3, color: palette.muted, fontSize: 13 },
  confidence: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    color: palette.green,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: palette.targetBand,
  },
  correctionContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 14,
  },
  filledInput: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 18,
    color: palette.ink,
    backgroundColor: palette.control,
    fontSize: 16,
  },
  detectionsCard: {
    minHeight: 84,
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  currentDetection: { color: palette.ink, fontSize: 16, fontWeight: '600' },
  correctionInput: {
    minHeight: 150,
    padding: 16,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 24,
    color: palette.ink,
    backgroundColor: palette.paper,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  errorCard: {
    padding: 20,
    borderRadius: 18,
    gap: 12,
    backgroundColor: palette.surface,
  },
  errorHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorTitle: {
    flex: 1,
    color: palette.rustText,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBody: { color: palette.body, fontSize: 14, lineHeight: 20 },
  technical: { color: palette.body, fontSize: 13 },
  retry: {
    paddingVertical: 6,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
