import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';

import type {
  GlucosePrediction,
  JanuaryClient,
  Sex,
} from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
import { predictFixtureGlucose } from './e2eFixtures';
import { FoodPickerSheet, type SelectedFood } from './FoodPickerSheet';

interface GlucoseScreenProps {
  client: JanuaryClient;
  configured: boolean;
  fixtures: boolean;
  onSettings: () => void;
}

export function GlucoseScreen({
  client,
  configured,
  fixtures,
  onSettings,
}: GlucoseScreenProps) {
  const [age, setAge] = useState('36');
  const [sex, setSex] = useState<Sex>('female');
  const [height, setHeight] = useState('66');
  const [weight, setWeight] = useState('150');
  const [foods, setFoods] = useState<SelectedFood[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<GlucosePrediction>();

  async function predict() {
    setLoading(true);
    setError(undefined);
    try {
      const prediction = fixtures
        ? await predictFixtureGlucose(sex === 'male')
        : await client.glucose.predict({
            foods: foods.map((food) => food.selection),
            startTime: new Date().toISOString(),
            userProfile: {
              activityLevel: 'moderately_active',
              age: Number(age),
              height: { unit: 'in', value: Number(height) },
              sex,
              weight: { unit: 'lb', value: Number(weight) },
            },
          });
      setResult(prediction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <View style={sharedStyles.screen} testID="glucose-results-screen">
        <View style={styles.compactHeader}>
          <Pressable
            accessibilityLabel="Back from estimated response"
            onPress={() => setResult(undefined)}
            style={sharedStyles.iconButton}
            testID="glucose-result-back"
          >
            <MaterialCommunityIcons
              color={palette.ink}
              name="arrow-left"
              size={22}
            />
          </Pressable>
          <Text style={styles.compactTitle}>Estimated response</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={sharedStyles.content}>
          <View style={styles.impactCard} testID="glucose-result">
            <Text style={sharedStyles.label}>Predicted glucose impact</Text>
            <Text style={styles.impactTitle}>{impactTitle(result.impact)}</Text>
            <Text style={sharedStyles.body}>
              Estimated from the meal, serving sizes, and profile entered below.
            </Text>
          </View>
          <PredictionChart result={result} />
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.cardTitle}>Meal summary</Text>
            {foods.map((food, index) => (
              <View key={`${food.item.id}-${index}`} style={styles.summaryRow}>
                <MaterialCommunityIcons
                  color={palette.green}
                  name="food-outline"
                  size={20}
                />
                <Text style={styles.summaryName}>
                  {food.item.name ?? 'Unnamed food'}
                </Text>
                <Text style={styles.summaryQuantity}>
                  {food.selection.serving.quantity} serving
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.resultActions}>
            <Pressable
              onPress={() => setResult(undefined)}
              style={[sharedStyles.secondaryButton, styles.flex]}
              testID="glucose-adjust"
            >
              <Text style={sharedStyles.secondaryText}>Adjust meal</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setResult(undefined);
                setFoods([]);
              }}
              style={[sharedStyles.primaryButton, styles.flex]}
              testID="glucose-start-over"
            >
              <Text style={sharedStyles.primaryText}>Start over</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={sharedStyles.screen} testID="glucose-screen">
      <View style={sharedStyles.header}>
        <Text accessibilityRole="header" style={sharedStyles.title}>
          Glucose
        </Text>
        <Pressable
          accessibilityLabel="Open settings"
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
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={sharedStyles.card}>
          <View style={styles.introRow}>
            <View style={styles.chartIcon}>
              <MaterialCommunityIcons
                color={palette.green}
                name="chart-line"
                size={24}
              />
            </View>
            <View style={styles.flex}>
              <Text style={sharedStyles.cardTitle}>
                Estimate this meal’s response
              </Text>
              <Text style={sharedStyles.body}>
                Combine a basic profile with foods and serving quantities.
                Nothing is saved to Food Logs.
              </Text>
            </View>
          </View>
        </View>

        <Text style={sharedStyles.label}>Your profile</Text>
        <View style={sharedStyles.card}>
          <View style={styles.fieldGrid}>
            <NumberField
              label="Age"
              onChangeText={setAge}
              testID="glucose-age"
              value={age}
            />
            <NumberField
              label="Height · in"
              onChangeText={setHeight}
              testID="glucose-height"
              value={height}
            />
            <NumberField
              label="Weight · lb"
              onChangeText={setWeight}
              testID="glucose-weight"
              value={weight}
            />
          </View>
          <Text style={styles.fieldLabel}>Sex</Text>
          <View style={styles.segmented}>
            <SexButton
              label="Female"
              onPress={() => setSex('female')}
              selected={sex === 'female'}
              testID="glucose-sex-female"
            />
            <SexButton
              label="Male"
              onPress={() => setSex('male')}
              selected={sex === 'male'}
              testID="glucose-sex-male"
            />
          </View>
        </View>

        <Text style={sharedStyles.label}>Meal to simulate</Text>
        <View style={sharedStyles.card}>
          {foods.length === 0 ? (
            <Text style={sharedStyles.body}>
              Add one or more foods to estimate their combined response.
            </Text>
          ) : null}
          {foods.map((food, index) => (
            <View key={`${food.item.id}-${index}`}>
              {index > 0 ? <View style={sharedStyles.divider} /> : null}
              <View style={styles.selectedRow} testID={`glucose-food-${index}`}>
                <View style={styles.flex}>
                  <Text style={styles.selectedName}>
                    {food.item.name ?? 'Unnamed food'}
                  </Text>
                  <Text style={styles.selectedMeta}>
                    {food.item.calories != null
                      ? `${Math.round(food.item.calories)} cal`
                      : 'Selected serving'}
                  </Text>
                </View>
                <View style={styles.quantityControls}>
                  <Pressable
                    accessibilityLabel={`Decrease ${food.item.name ?? 'food'} quantity`}
                    onPress={() =>
                      updateQuantity(index, -0.25, foods, setFoods)
                    }
                    style={styles.quantityButton}
                  >
                    <MaterialCommunityIcons
                      color={palette.ink}
                      name="minus"
                      size={18}
                    />
                  </Pressable>
                  <Text style={styles.quantityText}>
                    {food.selection.serving.quantity}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Increase ${food.item.name ?? 'food'} quantity`}
                    onPress={() => updateQuantity(index, 0.25, foods, setFoods)}
                    style={styles.quantityButton}
                  >
                    <MaterialCommunityIcons
                      color={palette.ink}
                      name="plus"
                      size={18}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerVisible(true)}
            style={sharedStyles.secondaryButton}
            testID="glucose-add-food"
          >
            <MaterialCommunityIcons
              color={palette.green}
              name="plus"
              size={21}
            />
            <Text style={sharedStyles.secondaryText}>
              Add food to prediction
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View
            accessibilityRole="alert"
            style={sharedStyles.error}
            testID="glucose-error"
          >
            <Text style={sharedStyles.errorTitle}>
              January couldn’t complete the request
            </Text>
            <Text style={sharedStyles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => predict().catch(() => undefined)}
              style={sharedStyles.secondaryButton}
              testID="glucose-retry"
            >
              <Text style={sharedStyles.secondaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!configured || foods.length === 0 || loading}
          onPress={() => predict().catch(() => undefined)}
          style={[
            sharedStyles.primaryButton,
            (!configured || foods.length === 0 || loading) &&
              sharedStyles.disabled,
          ]}
          testID="glucose-predict"
        >
          {loading ? (
            <View collapsable={false} testID="glucose-loading">
              <ActivityIndicator color={palette.paper} />
            </View>
          ) : (
            <Text style={sharedStyles.primaryText}>
              Estimate glucose response
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <FoodPickerSheet
        client={client}
        fixtures={fixtures}
        onClose={() => setPickerVisible(false)}
        onSelect={(food) => setFoods((current) => [...current, food])}
        visible={pickerVisible}
      />
    </View>
  );
}

function PredictionChart({ result }: { result: GlucosePrediction }) {
  const width = 320;
  const height = 170;
  const inset = 24;
  const points = result.prediction;
  const minMinute = points[0]?.minutes ?? 0;
  const maxMinute = points.at(-1)?.minutes ?? 180;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values, result.chart.min ?? Infinity);
  const maxValue = Math.max(...values, result.chart.max ?? -Infinity);
  const x = (minute: number) =>
    inset +
    ((minute - minMinute) / Math.max(1, maxMinute - minMinute)) *
      (width - inset * 2);
  const y = (value: number) =>
    height -
    inset -
    ((value - minValue) / Math.max(1, maxValue - minValue)) *
      (height - inset * 2);
  const polyline = points
    .map((point) => `${x(point.minutes)},${y(point.value)}`)
    .join(' ');
  return (
    <View style={[sharedStyles.card, styles.chartCard]} testID="glucose-chart">
      <View style={styles.chartHeading}>
        <Text style={sharedStyles.cardTitle}>Three-hour estimate</Text>
        <Text style={styles.chartRange}>
          {Math.round(minValue)}–{Math.round(maxValue)} mg/dL
        </Text>
      </View>
      <Svg
        accessibilityLabel="Estimated glucose response chart"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
      >
        {[0, 1, 2].map((line) => {
          const lineY = inset + (line * (height - inset * 2)) / 2;
          return (
            <Line
              key={line}
              stroke={palette.divider}
              strokeWidth="1"
              x1={inset}
              x2={width - inset}
              y1={lineY}
              y2={lineY}
            />
          );
        })}
        <Polyline
          fill="none"
          points={polyline}
          stroke={palette.green}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <SvgText fill={palette.muted} fontSize="10" x={inset} y={height - 4}>
          Now
        </SvgText>
        <SvgText
          fill={palette.muted}
          fontSize="10"
          textAnchor="end"
          x={width - inset}
          y={height - 4}
        >
          3 hr
        </SvgText>
      </Svg>
    </View>
  );
}

function NumberField({
  label,
  onChangeText,
  testID,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        style={[sharedStyles.input, styles.numberInput]}
        testID={testID}
        value={value}
      />
    </View>
  );
}

function SexButton({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.sexButton, selected && styles.sexSelected]}
      testID={testID}
    >
      <Text style={[styles.sexText, selected && styles.sexTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function updateQuantity(
  index: number,
  delta: number,
  foods: SelectedFood[],
  setFoods: (value: SelectedFood[]) => void
) {
  const next = foods.flatMap((food, foodIndex) => {
    if (foodIndex !== index) return [food];
    const quantity =
      Math.round((food.selection.serving.quantity + delta) * 100) / 100;
    if (quantity < 0.25) return [];
    return [
      {
        ...food,
        selection: {
          ...food.selection,
          serving: { ...food.selection.serving, quantity },
        },
      },
    ];
  });
  setFoods(next);
}

function impactTitle(impact?: string): string {
  if (impact === 'low') return 'Low impact';
  if (impact === 'high') return 'High impact';
  return 'Moderate impact';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  compactHeader: {
    minHeight: 70,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 44 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chartIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  fieldGrid: { flexDirection: 'row', gap: 8 },
  numberField: { flex: 1, gap: 6 },
  fieldLabel: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  numberInput: { minHeight: 48, paddingHorizontal: 10, textAlign: 'center' },
  segmented: {
    padding: 4,
    borderRadius: 16,
    flexDirection: 'row',
    backgroundColor: palette.controlStrong,
  },
  sexButton: {
    minHeight: 40,
    flex: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexSelected: { backgroundColor: palette.surface },
  sexText: { color: palette.muted, fontSize: 14, fontWeight: '700' },
  sexTextSelected: { color: palette.ink },
  selectedRow: {
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedName: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  selectedMeta: { color: palette.muted, fontSize: 12, marginTop: 3 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.controlStrong,
  },
  quantityText: {
    minWidth: 30,
    color: palette.ink,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },
  impactCard: {
    padding: 22,
    borderRadius: 24,
    gap: 8,
    backgroundColor: palette.targetBand,
  },
  impactTitle: { color: palette.green, fontSize: 30, fontWeight: '800' },
  chartCard: { paddingHorizontal: 14 },
  chartHeading: {
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  chartRange: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  summaryRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  summaryName: { flex: 1, color: palette.ink, fontSize: 15, fontWeight: '700' },
  summaryQuantity: { color: palette.muted, fontSize: 12 },
  resultActions: { flexDirection: 'row', gap: 10 },
});
