import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type {
  DietPreference,
  DietRestriction,
  DetectedFood,
  FoodSearchItem,
  GlucosePrediction,
  JanuaryClient,
} from '@januaryai/react-native';

import { palette, serifFont, sharedStyles } from './demoTheme';
import {
  predictFixtureGlucose,
  suggestFixtureAlternatives,
} from './e2eFixtures';

export function FoodDetailScreen({
  client,
  fixtures,
  food: initialFood,
  onBack,
}: {
  client: JanuaryClient;
  fixtures: boolean;
  food: FoodSearchItem;
  onBack: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showGlucose, setShowGlucose] = useState(false);
  const [food, setFood] = useState(initialFood);
  const [detailLoadFailed, setDetailLoadFailed] = useState(false);
  useEffect(() => {
    if (fixtures) return;
    let active = true;
    client.foods
      .get({ foodId: initialFood.id })
      .then((result) => {
        if (active) {
          setFood(result);
          setDetailLoadFailed(false);
        }
      })
      .catch(() => {
        if (active) setDetailLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [client, fixtures, initialFood]);
  const serving =
    food.servings.find((item) => item.isPrimary) ?? food.servings[0];
  const servingQuantity = serving?.quantity ?? 1;
  const servingUnit = serving?.unit ?? 'serving';
  const scale = (quantity * (serving?.scalingFactor ?? 1)) / servingQuantity;
  return (
    <View style={sharedStyles.screen} testID="food-detail-screen">
      <CompactHeader onBack={onBack} title="Food details" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {food.photoURL ? (
            <Image
              resizeMode="contain"
              source={{ uri: food.photoURL }}
              style={styles.heroImage}
            />
          ) : (
            <MaterialCommunityIcons
              color={palette.green}
              name="silverware-fork-knife"
              size={44}
            />
          )}
        </View>
        <View>
          <Text style={styles.foodName}>{food.name ?? 'Unnamed food'}</Text>
          {food.brandName ? (
            <Text style={styles.brand}>{food.brandName}</Text>
          ) : null}
        </View>

        <View
          style={[styles.card, styles.servingCard]}
          testID="food-serving-controls"
        >
          <View>
            <Text style={styles.smallLabel}>Serving unit</Text>
            <View style={styles.servingTitleRow}>
              <Text style={styles.servingTitle}>
                {servingUnit}
                {serving?.weightGrams
                  ? ` · ${formatNumber(serving.weightGrams)} g`
                  : ''}
              </Text>
              <MaterialIcons
                color={palette.green}
                name="unfold-more"
                size={20}
              />
            </View>
          </View>
          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>
              Quantity: {formatNumber(quantity)} {servingUnit}
            </Text>
            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel="Decrease quantity"
                onPress={() => setQuantity(Math.max(0.25, quantity - 0.25))}
                style={styles.stepperButton}
              >
                <Text style={styles.stepperSymbol}>−</Text>
              </Pressable>
              <View style={styles.stepperDivider} />
              <Pressable
                accessibilityLabel="Increase quantity"
                onPress={() => setQuantity(quantity + 0.25)}
                style={styles.stepperButton}
              >
                <Text style={styles.stepperSymbol}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.macroCard} testID="food-macros">
          <Macro
            label="Calories"
            unit="cal"
            value={(food.calories ?? 100) * scale}
          />
          <Macro label="Protein" unit="g" value={(food.protein ?? 4) * scale} />
          <View style={styles.fullDivider} />
          <Macro
            label="Carbs"
            unit="g"
            value={(food.carbohydrates ?? 20) * scale}
          />
          <Macro label="Fat" unit="g" value={(food.totalFat ?? 2) * scale} />
        </View>

        <View style={styles.card} testID="food-nutrition">
          <Text style={styles.cardHeading}>Nutrition facts</Text>
          <NutritionRow
            label="Fiber"
            unit="g"
            value={(food.fiber ?? 3) * scale}
          />
          <View style={styles.fullDivider} />
          <NutritionRow
            label="Sodium"
            unit="mg"
            value={(food.sodium ?? 10) * scale}
          />
        </View>

        <Pressable
          onPress={() => setShowGlucose(true)}
          style={sharedStyles.primaryButton}
          testID="food-check-glucose"
        >
          <MaterialIcons color={palette.paper} name="monitor-heart" size={23} />
          <Text style={sharedStyles.primaryText}>Check glucose</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowAlternatives(true)}
          style={sharedStyles.secondaryButton}
          testID="food-alternatives"
        >
          <MaterialIcons color={palette.green} name="eco" size={22} />
          <Text style={sharedStyles.secondaryText}>Find food alternatives</Text>
        </Pressable>
        <Text style={styles.disclosure}>Technical details　›</Text>
        {detailLoadFailed ? (
          <Text style={styles.detailWarning}>
            Complete serving details could not be loaded. Showing the serving
            returned by search.
          </Text>
        ) : null}
      </ScrollView>
      <FoodGlucoseSheet
        client={client}
        fixtures={fixtures}
        food={food}
        onClose={() => setShowGlucose(false)}
        quantity={quantity}
        serving={`${formatNumber(servingQuantity)} ${servingUnit}`}
        servingId={serving?.id}
        visible={showGlucose}
      />
      <AlternativesSheet
        client={client}
        fixtures={fixtures}
        food={food}
        onClose={() => setShowAlternatives(false)}
        visible={showAlternatives}
      />
    </View>
  );
}

function CompactHeader({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={`Back from ${title}`}
        onPress={onBack}
        style={sharedStyles.iconButton}
        testID="food-detail-back"
      >
        <MaterialIcons color={palette.ink} name="chevron-left" size={28} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function Macro({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number;
}) {
  return (
    <View style={styles.macro}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.metricRow}>
        <Text style={styles.metricValue}>{formatNumber(value)}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function NutritionRow({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number;
}) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>
        {formatNumber(value)} {unit}
      </Text>
    </View>
  );
}

function FullSheet({
  children,
  onClose,
  title,
  visible,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.sheet,
            {
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityLabel={`Close ${title}`}
              onPress={onClose}
              style={sharedStyles.iconButton}
            >
              <MaterialIcons color={palette.ink} name="close" size={27} />
            </Pressable>
            <Text style={styles.sheetTitle}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function FoodGlucoseSheet({
  client,
  fixtures,
  food,
  onClose,
  quantity,
  serving,
  servingId,
  visible,
}: {
  client: JanuaryClient;
  fixtures: boolean;
  food: FoodSearchItem;
  onClose: () => void;
  quantity: number;
  serving: string;
  servingId?: string;
  visible: boolean;
}) {
  const [result, setResult] = useState<GlucosePrediction>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function predict() {
    if (!servingId) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = fixtures
        ? await predictFixtureGlucose(food.barcode === 'fixture-glucose-retry')
        : await client.glucose.predict({
            foods: [{ id: food.id, serving: { id: servingId, quantity } }],
            startTime: new Date().toISOString(),
            userProfile: {
              age: 42,
              height: { unit: 'in', value: 66 },
              sex: 'female',
              weight: { unit: 'lb', value: 150 },
            },
          });
      setResult(response);
    } catch (caught) {
      setResult(undefined);
      setError(
        caught instanceof Error ? caught.message : 'Glucose prediction failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!visible) return;
    predict().catch(() => undefined);
    // Opening the sheet is the explicit request trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const peak = result
    ? result.prediction.reduce(
        (best, point) => (point.value > best.value ? point : best),
        result.prediction[0] ?? { minutes: 0, value: 0 }
      )
    : undefined;
  return (
    <FullSheet onClose={onClose} title="Glucose response" visible={visible}>
      <ScrollView contentContainerStyle={styles.sheetContent}>
        <View style={styles.sheetFoodHeading}>
          <Text style={styles.sheetFoodName}>
            {food.name ?? 'Unnamed food'}
          </Text>
          <Text style={styles.sheetServing}>{serving}</Text>
        </View>
        {loading ? (
          <View style={styles.sheetLoadingCard} testID="food-glucose-loading">
            <ActivityIndicator color={palette.green} />
            <Text style={styles.loadingTitle}>
              Predicting your glucose response…
            </Text>
            <Text style={styles.sheetServing}>
              This usually takes a few seconds.
            </Text>
          </View>
        ) : error ? (
          <SheetError
            message={error}
            onRetry={() => predict().catch(() => undefined)}
            testID="food-glucose-error"
          />
        ) : result ? (
          <>
            <View style={styles.impactBanner} testID="food-glucose-result">
              <MaterialIcons color="#F4C63F" name="monitor-heart" size={25} />
              <Text style={styles.impactTitle}>
                {impactLabel(result.impact)}
              </Text>
              <Text style={styles.impactCaption}>Estimated impact</Text>
            </View>
            <View style={styles.glucoseChart}>
              <View style={styles.chartHeading}>
                <Text style={styles.label}>PREDICTED RESPONSE</Text>
                <Text style={styles.chartUnit}>mg/dL</Text>
              </View>
              <Text style={styles.peakCaption}>
                Likely peak {formatNumber(peak?.value ?? 0)} · +
                {formatNumber(peak?.minutes ?? 0)} min
              </Text>
              <Svg height={250} viewBox="0 0 360 205" width="100%">
                <Rect
                  fill={palette.targetBand}
                  height="140"
                  width="360"
                  x="0"
                  y="35"
                />
                <Path
                  d="M 18 140 C 110 75, 170 35, 205 35 C 255 50, 300 105, 360 126 L 360 175 L 18 175 Z"
                  fill="rgba(168,95,61,0.12)"
                />
                <Path
                  d="M 18 140 C 110 75, 170 35, 205 35 C 255 50, 300 105, 360 126"
                  fill="none"
                  stroke="#B7653F"
                  strokeWidth="4"
                />
                <Circle
                  cx="18"
                  cy="140"
                  fill="#F4C63F"
                  r="9"
                  stroke={palette.ink}
                  strokeWidth="3"
                />
                <Circle
                  cx="205"
                  cy="35"
                  fill="white"
                  r="8"
                  stroke={palette.ink}
                  strokeWidth="3"
                />
              </Svg>
              <View style={styles.chartAxis}>
                {[0, 40, 80, 120].map((item) => (
                  <Text key={item} style={styles.smallLabel}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
            <View style={styles.glucoseMetrics}>
              <GlucoseMetric label="Peak" value={peak?.value} />
              <GlucoseMetric label="Target minimum" value={result.chart.min} />
              <GlucoseMetric label="Target maximum" value={result.chart.max} />
              <GlucoseMetric
                label="Data points"
                value={result.prediction.length}
                withUnit={false}
              />
            </View>
          </>
        ) : null}
        <View style={styles.card}>
          <View style={styles.profileHeading}>
            <MaterialCommunityIcons
              color={palette.ink}
              name="account-circle-outline"
              size={24}
            />
            <Text style={styles.loadingTitle}>Demo profile</Text>
          </View>
          <Text style={styles.sheetServing}>
            42 years · Female · 66 in · 150 lb · No reported condition
          </Text>
        </View>
        <Text style={styles.disclaimer}>
          This is an estimate for demonstration purposes, not medical advice.
        </Text>
      </ScrollView>
    </FullSheet>
  );
}

const restrictions = [
  'Gluten',
  'Lactose',
  'Yeast',
  'Tree Nuts',
  'Peanuts',
  'Dairy',
  'Eggs',
  'Sulfites',
  'Soy',
  'Wheat',
  'Shellfish',
  'Fish',
  'Mushrooms',
  'Sesame',
  'Msg',
  'Caffeine',
  'Fodmaps',
];
const preferences = [
  'Vegetarian',
  'Vegan',
  'Keto',
  'Paleo',
  'Pescatarian',
  'Low Carbohydrate',
  'High Protein',
  'Kosher',
  'Halal',
];

function AlternativesSheet({
  client,
  fixtures,
  food,
  onClose,
  visible,
}: {
  client: JanuaryClient;
  fixtures: boolean;
  food: FoodSearchItem;
  onClose: () => void;
  visible: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<DetectedFood[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (visible) return;
    setSelected([]);
    setResults(undefined);
    setLoading(false);
    setError(undefined);
  }, [visible]);
  function toggle(value: string) {
    setSelected((values) =>
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
  }
  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const dietRestrictions = selected
        .filter((item) => restrictions.includes(item))
        .map(toDietValue) as DietRestriction[];
      const dietPreferences = selected
        .filter((item) => preferences.includes(item))
        .map(toDietValue) as DietPreference[];
      const response = fixtures
        ? await suggestFixtureAlternatives(food.id, food.barcode)
        : await client.foods.suggestAlternatives({
            foodId: food.id,
            dietRestrictions,
            dietPreferences,
          });
      setResults(response.alternatives);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Alternatives request failed.'
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <FullSheet onClose={onClose} title="Food alternatives" visible={visible}>
      <ScrollView contentContainerStyle={styles.sheetContent}>
        <View style={styles.suggestionIntro}>
          <View style={styles.personalized}>
            <MaterialIcons color={palette.green} name="eco" size={24} />
            <Text style={styles.personalizedText}>
              Personalized suggestions
            </Text>
          </View>
          <Text style={styles.alternativeFoodName}>
            {food.name ?? 'Unnamed food'}
          </Text>
          <Text style={styles.introCopy}>
            Choose any dietary needs that should shape January’s
            recommendations.
          </Text>
        </View>
        <ChoiceSection
          items={restrictions}
          onToggle={toggle}
          selected={selected}
          title="DIETARY RESTRICTIONS"
        />
        <ChoiceSection
          items={preferences}
          onToggle={toggle}
          selected={selected}
          title="DIETARY PREFERENCES"
        />
        <Pressable
          disabled={loading}
          onPress={() => load().catch(() => undefined)}
          style={[sharedStyles.primaryButton, loading && sharedStyles.disabled]}
          testID="alternatives-refresh"
        >
          {loading ? (
            <View style={styles.loadingButton} testID="alternatives-loading">
              <ActivityIndicator color={palette.paper} />
              <Text style={sharedStyles.primaryText}>Finding alternatives</Text>
            </View>
          ) : (
            <>
              <MaterialIcons color={palette.paper} name="eco" size={22} />
              <Text style={sharedStyles.primaryText}>
                {results ? 'Refresh alternatives' : 'Find alternatives'}
              </Text>
            </>
          )}
        </Pressable>
        {error ? (
          <SheetError
            message={error}
            onRetry={() => load().catch(() => undefined)}
            testID="alternatives-error"
          />
        ) : results?.length === 0 ? (
          <View style={styles.emptyAlternative} testID="alternatives-empty">
            <MaterialIcons color={palette.green} name="eco" size={25} />
            <Text style={styles.cardHeading}>No suitable alternatives</Text>
            <Text style={styles.introCopy}>
              No foods matched every selected dietary need.
            </Text>
          </View>
        ) : results ? (
          <View style={styles.alternativeResults} testID="alternatives-results">
            <Text style={styles.label}>SUGGESTIONS · {results.length}</Text>
            {results.map((alternative, index) => (
              <View
                key={alternative.id ?? `${alternative.name}-${index}`}
                style={styles.alternativeCard}
              >
                <View style={styles.alternativeImage}>
                  <MaterialCommunityIcons
                    color={palette.green}
                    name="silverware-fork-knife"
                    size={22}
                  />
                </View>
                <View style={styles.alternativeCopy}>
                  <Text style={styles.alternativeTitle}>
                    {alternative.name ?? 'Unnamed food'}
                  </Text>
                  {alternative.brandName ? (
                    <Text style={styles.brand}>{alternative.brandName}</Text>
                  ) : null}
                  <Text style={styles.alternativeMeta}>
                    {alternative.nutrients.calories?.value ?? '—'} cal　P{' '}
                    {alternative.nutrients.protein?.value ?? '—'}g　C{' '}
                    {alternative.nutrients.carbohydrates?.value ?? '—'}g　F{' '}
                    {alternative.nutrients.totalFat?.value ?? '—'}g
                  </Text>
                </View>
                <MaterialIcons
                  color={palette.subdued}
                  name="chevron-right"
                  size={22}
                />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </FullSheet>
  );
}

function SheetError({
  message,
  onRetry,
  testID,
}: {
  message: string;
  onRetry: () => void;
  testID: string;
}) {
  return (
    <View style={styles.sheetError} testID={testID}>
      <View style={styles.errorHeading}>
        <MaterialIcons
          color={palette.rustText}
          name="error-outline"
          size={22}
        />
        <Text style={styles.errorTitle}>
          January couldn’t complete the request
        </Text>
      </View>
      <Text style={styles.errorBody}>{message}</Text>
      <Text style={styles.disclosure}>Technical details　›</Text>
      <Pressable
        onPress={onRetry}
        style={styles.retryButton}
        testID={`${testID}-retry`}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function GlucoseMetric({
  label,
  value,
  withUnit = true,
}: {
  label: string;
  value?: number;
  withUnit?: boolean;
}) {
  return (
    <View style={styles.glucoseMetric}>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={styles.glucoseMetricValue}>
        {value == null ? '—' : formatNumber(value)}
        {withUnit ? ' mg/dL' : ''}
      </Text>
    </View>
  );
}

function impactLabel(impact?: string): string {
  if (!impact) return 'Unknown impact';
  const normalized = impact.replace(/_/g, ' ').replace(/ impact$/i, '');
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} impact`;
}

function toDietValue(value: string): string {
  return value.toLowerCase().replace(/ /g, '_');
}

function ChoiceSection({
  items,
  onToggle,
  selected,
  title,
}: {
  items: string[];
  onToggle: (item: string) => void;
  selected: string[];
  title: string;
}) {
  return (
    <View style={styles.choiceSection}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.choices}>
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <Pressable
              accessibilityState={{ selected: active }}
              key={item}
              onPress={() => onToggle(item)}
              style={[styles.choice, active && styles.choiceSelected]}
            >
              <Text
                style={[styles.choiceText, active && styles.choiceTextSelected]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 44 },
  hero: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  heroImage: { width: '90%', height: '90%' },
  foodName: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  brand: { marginTop: 6, color: palette.muted, fontSize: 17, lineHeight: 24 },
  card: {
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    gap: 6,
    backgroundColor: palette.surface,
  },
  servingCard: { gap: 12 },
  smallLabel: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  servingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingTitle: {
    color: palette.green,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: { color: palette.ink, fontSize: 15, lineHeight: 20 },
  stepper: {
    height: 48,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.control,
  },
  stepperButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: { color: palette.ink, fontSize: 28 },
  stepperDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: palette.border,
  },
  macroCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    backgroundColor: palette.surface,
  },
  macro: { width: '50%' },
  label: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.15,
  },
  metricRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  metricValue: { color: palette.ink, fontFamily: 'monospace', fontSize: 26 },
  metricUnit: { color: palette.muted, fontSize: 17 },
  fullDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  cardHeading: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
  },
  nutritionRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionLabel: { color: palette.ink, fontSize: 17 },
  nutritionValue: { color: palette.ink, fontFamily: 'monospace', fontSize: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(29,26,20,0.48)' },
  sheet: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.paper,
  },
  sheetHandle: {
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
  sheetTitle: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  impactBanner: {
    minHeight: 72,
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.surface,
  },
  impactTitle: { flex: 1, color: '#F4C63F', fontSize: 20, fontWeight: '700' },
  impactCaption: { color: palette.muted, fontSize: 17 },
  glucoseChart: {
    overflow: 'hidden',
    paddingTop: 20,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    backgroundColor: palette.surface,
  },
  chartHeading: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartUnit: { color: palette.muted, fontSize: 17, fontWeight: '700' },
  peakCaption: {
    marginTop: 18,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  chartAxis: {
    marginTop: -32,
    paddingHorizontal: 18,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glucoseMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  glucoseMetric: {
    width: '47%',
    minHeight: 96,
    padding: 20,
    borderRadius: 24,
    backgroundColor: palette.surface,
  },
  glucoseMetricValue: {
    marginTop: 8,
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: '700',
  },
  sheetLoadingCard: {
    minHeight: 220,
    padding: 22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: palette.surface,
  },
  loadingTitle: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  sheetFoodHeading: { gap: 6 },
  sheetFoodName: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  sheetServing: { color: palette.muted, fontSize: 15, lineHeight: 20 },
  loadingButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclaimer: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  disclosure: {
    minHeight: 48,
    color: palette.body,
    fontSize: 13,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  detailWarning: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  sheetError: {
    padding: 20,
    borderRadius: 18,
    gap: 12,
    backgroundColor: palette.rustBackground,
  },
  errorHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorTitle: {
    flex: 1,
    color: palette.rustText,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBody: { color: palette.rustText, fontSize: 14, lineHeight: 20 },
  retryButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(140,74,47,0.35)',
    borderRadius: 14,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: palette.rustText, fontSize: 14, fontWeight: '700' },
  suggestionIntro: {
    padding: 22,
    borderRadius: 24,
    gap: 10,
    backgroundColor: palette.surface,
  },
  alternativeFoodName: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
  },
  personalized: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personalizedText: { color: palette.green, fontSize: 15, fontWeight: '700' },
  introCopy: { color: palette.body, fontSize: 17, lineHeight: 24 },
  choiceSection: { gap: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    width: '48.5%',
    minHeight: 44,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  choiceSelected: { borderColor: palette.ink, backgroundColor: palette.ink },
  choiceText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  choiceTextSelected: { color: palette.paper },
  alternativeResults: { gap: 12 },
  emptyAlternative: {
    minHeight: 164,
    padding: 22,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.surface,
  },
  alternativeCard: {
    minHeight: 102,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
  },
  alternativeImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  alternativeCopy: { flex: 1, gap: 4 },
  alternativeTitle: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  alternativeMeta: {
    color: palette.muted,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
