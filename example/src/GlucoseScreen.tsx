import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type {
  GlucosePrediction,
  JanuaryClient,
  MedicalCondition,
  Sex,
} from '@januaryai/react-native';

import { palette, serifFont, sharedStyles } from './demoTheme';
import { predictFixtureGlucose } from './e2eFixtures';
import { FoodPickerSheet, type SelectedFood } from './FoodPickerSheet';

interface GlucoseScreenProps {
  client: JanuaryClient;
  configured: boolean;
  fixtures: boolean;
  onSettings: () => void;
}

type HeightUnit = 'imperial' | 'metric';
type WeightUnit = 'lb' | 'kg';

export function GlucoseScreen({
  client,
  configured,
  fixtures,
  onSettings,
}: GlucoseScreenProps) {
  const [age, setAge] = useState('42');
  const [sex, setSex] = useState<Sex>('female');
  const [heightInches, setHeightInches] = useState(66);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('imperial');
  const [weightPounds, setWeightPounds] = useState(150);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb');
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [showConditions, setShowConditions] = useState(false);
  const [foods, setFoods] = useState<SelectedFood[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<GlucosePrediction>();
  const startTime = useMemo(() => new Date(), []);

  async function predict() {
    setLoading(true);
    setError(undefined);
    try {
      const prediction = fixtures
        ? await predictFixtureGlucose(sex === 'male')
        : await client.glucose.predict({
            foods: foods.map((food) => food.selection),
            startTime: startTime.toISOString(),
            userProfile: {
              activityLevel: 'moderately_active',
              age: Number(age),
              healthConditions: conditions,
              height: { unit: 'in', value: heightInches },
              sex,
              weight: { unit: 'lb', value: weightPounds },
            },
          });
      setResult(prediction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  }

  if (showConditions) {
    return (
      <ConditionsScreen
        onBack={() => setShowConditions(false)}
        onChange={setConditions}
        selected={conditions}
      />
    );
  }
  if (result) {
    return (
      <PredictionResult
        foods={foods}
        onAdjust={() => setResult(undefined)}
        onStartOver={() => {
          setResult(undefined);
          setFoods([]);
        }}
        result={result}
      />
    );
  }

  const feet = Math.floor(Math.round(heightInches) / 12);
  const inches = Math.round(heightInches) % 12;
  const displayedWeight =
    weightUnit === 'lb' ? weightPounds : weightPounds * 0.45359237;

  return (
    <View style={sharedStyles.screen} testID="glucose-screen">
      <LargeNavigationHeader onSettings={onSettings} title="Glucose" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <WorkflowGuide />

        <View style={styles.sectionCopy}>
          <Text style={styles.sectionLabel}>PREDICTION PROFILE</Text>
          <Text style={styles.sectionDetail}>
            Age, sex, body measurements, and health conditions influence the
            estimated response.
          </Text>
        </View>
        <View style={styles.formCard}>
          <View style={styles.measurementRow}>
            <Text style={styles.rowTitle}>Age</Text>
            <TextInput
              accessibilityLabel="Age"
              keyboardType="decimal-pad"
              onChangeText={(value) => setAge(numericText(value))}
              style={styles.ageInput}
              testID="glucose-age"
              value={age}
            />
            <Text style={styles.unitText}>years</Text>
          </View>
          <Divider />
          <View style={styles.measurementRow}>
            <Text style={styles.rowTitle}>Sex</Text>
            <SegmentedControl
              items={[
                { id: 'female', label: 'Female' },
                { id: 'male', label: 'Male' },
              ]}
              onSelect={(value) => setSex(value as Sex)}
              selected={sex}
              testIDPrefix="glucose-sex"
            />
          </View>
          <Divider />
          <View style={styles.expandedMeasurement}>
            <View style={styles.measurementHeading}>
              <Text style={styles.rowTitle}>Height</Text>
              <SegmentedControl
                items={[
                  { id: 'imperial', label: 'ft + in' },
                  { id: 'metric', label: 'cm' },
                ]}
                onSelect={(value) => setHeightUnit(value as HeightUnit)}
                selected={heightUnit}
                testIDPrefix="glucose-height-unit"
              />
            </View>
            {heightUnit === 'imperial' ? (
              <View style={styles.inputPair}>
                <MeasurementField
                  label="Feet"
                  onChange={(value) =>
                    setHeightInches(clamp(value * 12 + inches, 36, 96))
                  }
                  testID="glucose-height-feet"
                  value={feet}
                />
                <MeasurementField
                  label="Inches"
                  onChange={(value) =>
                    setHeightInches(clamp(feet * 12 + value, 36, 96))
                  }
                  testID="glucose-height-inches"
                  value={inches}
                />
              </View>
            ) : (
              <MeasurementField
                decimal
                label="Centimeters"
                onChange={(value) =>
                  setHeightInches(clamp(value / 2.54, 36, 96))
                }
                testID="glucose-height-centimeters"
                value={heightInches * 2.54}
              />
            )}
          </View>
          <Divider />
          <View style={styles.expandedMeasurement}>
            <View style={styles.measurementHeading}>
              <Text style={styles.rowTitle}>Weight</Text>
              <SegmentedControl
                items={[
                  { id: 'lb', label: 'lb' },
                  { id: 'kg', label: 'kg' },
                ]}
                onSelect={(value) => setWeightUnit(value as WeightUnit)}
                selected={weightUnit}
                testIDPrefix="glucose-weight-unit"
              />
            </View>
            <MeasurementField
              decimal
              label={weightUnit === 'lb' ? 'Pounds' : 'Kilograms'}
              onChange={(value) =>
                setWeightPounds(
                  clamp(
                    weightUnit === 'lb' ? value : value / 0.45359237,
                    60,
                    700
                  )
                )
              }
              testID="glucose-weight"
              value={displayedWeight}
            />
          </View>
          <Divider />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowConditions(true)}
            style={styles.conditionsRow}
            testID="glucose-health-conditions"
          >
            <Text style={styles.conditionsTitle}>Health conditions</Text>
            <Text style={styles.conditionsValue}>
              {conditions.length === 0
                ? 'None'
                : `${conditions.length} selected`}
            </Text>
            <MaterialCommunityIcons
              color={palette.subdued}
              name="chevron-right"
              size={22}
            />
          </Pressable>
        </View>

        <View style={styles.sectionCopy}>
          <Text style={styles.sectionLabel}>MEAL TO SIMULATE</Text>
          <Text style={styles.sectionDetail}>
            Add one or more foods here. This meal is used only for the
            prediction and is not saved to Food Logs.
          </Text>
        </View>
        <View style={styles.formCard}>
          <View style={styles.startTimeRow}>
            <Text style={[styles.rowTitle, styles.flex]}>Start time</Text>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{formatDate(startTime)}</Text>
            </View>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{formatTime(startTime)}</Text>
            </View>
          </View>
          {foods.map((food, index) => (
            <View key={`${food.item.id}-${index}`}>
              <Divider />
              <SelectedFoodRow
                food={food}
                index={index}
                onQuantity={(delta) =>
                  setFoods(updateFoodQuantity(foods, index, delta))
                }
              />
            </View>
          ))}
          <Divider />
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerVisible(true)}
            style={styles.addFoodButton}
            testID="glucose-add-food"
          >
            <Text style={styles.addFoodText}>＋ Add food to prediction</Text>
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

function LargeNavigationHeader({
  onSettings,
  title,
}: {
  onSettings: () => void;
  title: string;
}) {
  return (
    <View style={styles.largeHeader}>
      <View style={styles.headerActionRow}>
        <View />
        <Pressable
          accessibilityLabel="Open settings"
          onPress={onSettings}
          style={sharedStyles.iconButton}
        >
          <MaterialCommunityIcons
            color={palette.ink}
            name="cog-outline"
            size={25}
          />
        </Pressable>
      </View>
      <Text accessibilityRole="header" style={styles.largeTitle}>
        {title}
      </Text>
    </View>
  );
}

function WorkflowGuide() {
  const steps = [
    'Review the prediction profile',
    'Add every food in the meal to simulate',
    'Estimate the glucose response curve',
  ];
  return (
    <View style={styles.guideCard}>
      <View style={styles.guideHeading}>
        <View style={styles.guideIcon}>
          <MaterialIcons color={palette.green} name="monitor-heart" size={21} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.guideTitle}>Estimate this meal’s response</Text>
          <Text style={styles.guideBody}>
            Glucose prediction is a simulation. Your profile shapes the
            estimate, and the foods and servings define the meal. It does not
            create a food log.
          </Text>
        </View>
      </View>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SegmentedControl({
  items,
  onSelect,
  selected,
  testIDPrefix,
}: {
  items: { id: string; label: string }[];
  onSelect: (id: string) => void;
  selected: string;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.segmented}>
      {items.map((item) => {
        const isSelected = item.id === selected;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            testID={`${testIDPrefix}-${item.id}`}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentSelectedText,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MeasurementField({
  decimal = false,
  label,
  onChange,
  testID,
  value,
}: {
  decimal?: boolean;
  label: string;
  onChange: (value: number) => void;
  testID: string;
  value: number;
}) {
  const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <View style={styles.numberField}>
      <Text style={styles.numberLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        onChangeText={(candidate) => {
          const number = Number(numericText(candidate));
          if (Number.isFinite(number)) onChange(number);
        }}
        selectTextOnFocus
        style={styles.numberInput}
        testID={testID}
        value={display}
      />
    </View>
  );
}

function ConditionsScreen({
  onBack,
  onChange,
  selected,
}: {
  onBack: () => void;
  onChange: (value: MedicalCondition[]) => void;
  selected: MedicalCondition[];
}) {
  function toggle(value: MedicalCondition) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  }
  return (
    <View style={sharedStyles.screen} testID="conditions-screen">
      <View style={styles.conditionsHeader}>
        <Pressable
          accessibilityLabel="Back from Health conditions"
          onPress={onBack}
          style={sharedStyles.iconButton}
          testID="conditions-back"
        >
          <MaterialCommunityIcons
            color={palette.ink}
            name="chevron-left"
            size={26}
          />
        </Pressable>
        <Text accessibilityRole="header" style={styles.conditionsHeading}>
          Health conditions
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.conditionsContent}>
        <Text style={styles.conditionsHelp}>
          Select all that apply. Leave both unselected if neither condition
          applies.
        </Text>
        <View style={styles.conditionsCard}>
          <ConditionRow
            label="Type 2 diabetes"
            onPress={() => toggle('type_2_diabetes')}
            selected={selected.includes('type_2_diabetes')}
            testID="condition-type-2-diabetes"
          />
          <Divider />
          <ConditionRow
            label="Prediabetes"
            onPress={() => toggle('prediabetes')}
            selected={selected.includes('prediabetes')}
            testID="condition-prediabetes"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ConditionRow({
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
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={styles.conditionRow}
      testID={testID}
    >
      <Text style={styles.conditionLabel}>{label}</Text>
      <MaterialCommunityIcons
        color={selected ? palette.green : palette.border}
        name={
          selected ? 'check-circle-outline' : 'checkbox-blank-circle-outline'
        }
        size={25}
      />
    </Pressable>
  );
}

function SelectedFoodRow({
  food,
  index,
  onQuantity,
}: {
  food: SelectedFood;
  index: number;
  onQuantity: (delta: number) => void;
}) {
  const serving =
    food.item.servings.find(
      (candidate) => candidate.id === food.selection.serving.id
    ) ?? food.item.servings[0];
  return (
    <View style={styles.selectedFoodRow} testID={`glucose-food-${index}`}>
      <View style={styles.flex}>
        <Text style={styles.selectedFoodName}>
          {food.item.name ?? 'Unnamed food'}
        </Text>
        <Text style={styles.selectedServing}>
          {formatNumber(serving?.quantity ?? 1)} {serving?.unit ?? 'serving'}
        </Text>
      </View>
      <QuantityButton
        label={`Decrease ${food.item.name ?? 'food'} quantity`}
        onPress={() => onQuantity(-0.25)}
        symbol="−"
      />
      <Text style={styles.quantityText}>
        {formatNumber(food.selection.serving.quantity)}
      </Text>
      <QuantityButton
        label={`Increase ${food.item.name ?? 'food'} quantity`}
        onPress={() => onQuantity(0.25)}
        primary
        symbol="+"
      />
    </View>
  );
}

function QuantityButton({
  label,
  onPress,
  primary = false,
  symbol,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  symbol: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.quantityButton, primary && styles.quantityButtonPrimary]}
    >
      <Text
        style={[
          styles.quantityButtonText,
          primary && styles.quantityButtonTextPrimary,
        ]}
      >
        {symbol}
      </Text>
    </Pressable>
  );
}

function PredictionResult({
  foods,
  onAdjust,
  onStartOver,
  result,
}: {
  foods: SelectedFood[];
  onAdjust: () => void;
  onStartOver: () => void;
  result: GlucosePrediction;
}) {
  const peak = result.prediction.reduce(
    (maximum, point) => (point.value > maximum.value ? point : maximum),
    result.prediction[0] ?? { minutes: 0, value: 0 }
  );
  const start = result.prediction[0]?.value ?? peak.value;
  const delta = Math.max(0, Math.round(peak.value - start));
  const peakStart = Math.max(0, Math.round(peak.minutes - 15));
  const peakEnd = Math.round(peak.minutes + 15);
  return (
    <View style={sharedStyles.screen} testID="glucose-results-screen">
      <View style={styles.compactHeader}>
        <Pressable
          accessibilityLabel="Back from estimated response"
          onPress={onAdjust}
          style={sharedStyles.iconButton}
          testID="glucose-result-back"
        >
          <MaterialCommunityIcons
            color={palette.ink}
            name="chevron-left"
            size={26}
          />
        </Pressable>
        <Text style={styles.compactTitle}>Estimated response</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.resultContent}>
        <PredictionChart
          delta={delta}
          impact={result.impact ?? 'unknown'}
          peak={Math.round(peak.value)}
          peakWindow={`${peakStart}–${peakEnd} min`}
          result={result}
        />
        <View style={styles.foodImpactCard} testID="glucose-result">
          {foods.map((food, index) => {
            const serving =
              food.item.servings.find(
                (candidate) => candidate.id === food.selection.serving.id
              ) ?? food.item.servings[0];
            return (
              <View key={`${food.item.id}-${index}`} style={styles.impactRow}>
                <View style={styles.flex}>
                  <Text style={styles.impactFoodName}>
                    {food.item.name ?? 'Unnamed food'}
                  </Text>
                  <Text style={styles.impactFoodMeta}>
                    {formatNumber(serving?.quantity ?? 1)}{' '}
                    {serving?.unit ?? 'serving'} · quantity{' '}
                    {formatNumber(food.selection.serving.quantity)}
                  </Text>
                </View>
                {index === 0 ? (
                  <Text style={styles.impactDelta}>+{delta}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={styles.worthKnowing}>
          <Text style={styles.sectionLabel}>WORTH KNOWING</Text>
          <Text style={styles.worthKnowingText}>
            This estimate reflects the foods, servings, and profile entered
            above. Adjusting the meal will generate a new prediction. It does
            not create or update a food log.
          </Text>
        </View>
        <Text style={styles.disclaimer}>
          This is a prediction, not a medical recommendation.
        </Text>
        <View style={styles.resultActions}>
          <Pressable
            onPress={onAdjust}
            style={[sharedStyles.secondaryButton, styles.flex]}
            testID="glucose-adjust"
          >
            <Text style={sharedStyles.secondaryText}>Adjust meal</Text>
          </Pressable>
          <Pressable
            onPress={onStartOver}
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

function PredictionChart({
  delta,
  impact,
  peak,
  peakWindow,
  result,
}: {
  delta: number;
  impact: string;
  peak: number;
  peakWindow: string;
  result: GlucosePrediction;
}) {
  const width = 360;
  const chartTop = 0;
  const chartHeight = 138;
  const left = 16;
  const right = 360;
  const points = result.prediction.filter((point) => point.minutes <= 120);
  const dataMinimum = Math.min(
    ...points.map((point) => point.value),
    result.chart.min ?? Infinity
  );
  const dataMaximum = Math.max(
    ...points.map((point) => point.value),
    result.chart.max ?? -Infinity
  );
  const span = Math.max(dataMaximum - dataMinimum, 20);
  const minValue =
    Math.floor((dataMinimum - Math.max(12, span * 0.16)) / 10) * 10;
  const maxValue =
    Math.ceil((dataMaximum + Math.max(18, span * 0.24)) / 10) * 10;
  const x = (minute: number) => left + (minute / 120) * (right - left);
  const y = (value: number) =>
    chartTop +
    chartHeight -
    ((value - minValue) / Math.max(1, maxValue - minValue)) * chartHeight;
  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${x(point.minutes)} ${y(point.value)}`
    )
    .join(' ');
  const areaPath = `${linePath} L ${x(points.at(-1)?.minutes ?? 120)} ${chartHeight} L ${left} ${chartHeight} Z`;
  const peakPoint = points.reduce(
    (maximum, point) => (point.value > maximum.value ? point : maximum),
    points[0] ?? { minutes: 0, value: 0 }
  );
  return (
    <View style={styles.predictionCard} testID="glucose-chart">
      <View style={styles.peakCopy}>
        <Text style={styles.sectionLabel}>LIKELY PEAK</Text>
        <View style={styles.peakRow}>
          <Text style={styles.peakValue}>{peak}</Text>
          <Text style={styles.peakDetail}>
            {impactLabel(impact).toLowerCase()} · {peakWindow}
          </Text>
        </View>
        <Text style={styles.peakDelta}>+{delta} above meal start</Text>
      </View>
      <Svg
        accessibilityLabel="Estimated glucose response chart"
        height={138}
        viewBox={`0 0 ${width} ${chartHeight}`}
        width="100%"
      >
        <Rect
          fill={palette.targetBand}
          height={chartHeight}
          width={width}
          x="0"
          y="0"
        />
        <Path d={areaPath} fill="rgba(168,95,61,0.10)" />
        <Path
          d={linePath}
          fill="none"
          stroke="#B7653F"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <Circle
          cx={x(points[0]?.minutes ?? 0)}
          cy={y(points[0]?.value ?? 0)}
          fill="#F4C63F"
          r="9"
          stroke={palette.ink}
          strokeWidth="2.5"
        />
        <Circle
          cx={x(peakPoint.minutes)}
          cy={y(peakPoint.value)}
          fill={palette.surface}
          r="8"
          stroke={palette.ink}
          strokeWidth="2.5"
        />
      </Svg>
      <View style={styles.axisLabels}>
        {[0, 40, 80, 120].map((minute) => (
          <Text key={minute} style={styles.axisLabel}>
            {minute}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendText}>Prediction</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendMeal} />
          <Text style={styles.legendText}>Meal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendTarget} />
          <Text style={styles.legendText}>Target</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendPeak} />
          <Text style={styles.legendText}>Peak</Text>
        </View>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function updateFoodQuantity(
  foods: SelectedFood[],
  index: number,
  delta: number
): SelectedFood[] {
  return foods.flatMap((food, foodIndex) => {
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
}

function numericText(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
function formatDate(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
function formatTime(value: Date): string {
  return value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
function impactLabel(impact: string): string {
  if (impact === 'low') return 'Low impact';
  if (impact === 'high') return 'High impact';
  if (impact === 'medium') return 'Medium impact';
  return 'Unknown impact';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
  },
  largeHeader: { height: 112, backgroundColor: palette.paper },
  headerActionRow: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  largeTitle: {
    paddingHorizontal: 16,
    color: palette.ink,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  guideCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    gap: 18,
    backgroundColor: palette.surface,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  guideHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  guideTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 30,
  },
  guideBody: {
    marginTop: 5,
    color: palette.body,
    fontSize: 15,
    lineHeight: 20,
  },
  steps: { gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  stepNumberText: { color: '#3E5A3A', fontSize: 13, fontWeight: '700' },
  stepText: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  sectionCopy: { gap: 10 },
  sectionLabel: {
    paddingHorizontal: 6,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.15,
  },
  sectionDetail: { color: palette.body, fontSize: 15, lineHeight: 20 },
  formCard: {
    marginTop: -14,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    backgroundColor: palette.surface,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  measurementRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  rowTitle: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  ageInput: {
    width: 72,
    marginLeft: 'auto',
    paddingVertical: 10,
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'right',
  },
  unitText: { marginLeft: 10, color: palette.muted, fontSize: 14 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  segmented: {
    width: 170,
    marginLeft: 'auto',
    padding: 2,
    borderRadius: 20,
    flexDirection: 'row',
    backgroundColor: '#EAE8E5',
  },
  segment: {
    minHeight: 36,
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    borderWidth: 1,
    borderColor: '#E7E4DF',
    backgroundColor: palette.surface,
  },
  segmentText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  segmentSelectedText: { fontWeight: '700' },
  expandedMeasurement: { paddingVertical: 12, gap: 12 },
  measurementHeading: { flexDirection: 'row', alignItems: 'center' },
  inputPair: { flexDirection: 'row', gap: 12 },
  numberField: { flex: 1, gap: 6 },
  numberLabel: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  numberInput: {
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: 14,
    color: palette.ink,
    backgroundColor: palette.control,
    fontFamily: 'monospace',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'right',
  },
  conditionsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conditionsTitle: { flex: 1, color: palette.ink, fontSize: 17 },
  conditionsValue: { color: palette.muted, fontSize: 15 },
  startTimeRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: palette.control,
  },
  dateText: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  addFoodButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFoodText: { color: palette.goldText, fontSize: 17, fontWeight: '600' },
  selectedFoodRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFoodName: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  selectedServing: { marginTop: 2, color: palette.muted, fontSize: 14 },
  quantityButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  quantityButtonPrimary: {
    borderColor: palette.ink,
    backgroundColor: palette.ink,
  },
  quantityButtonText: { color: palette.ink, fontSize: 22 },
  quantityButtonTextPrimary: { color: palette.paper },
  quantityText: {
    width: 42,
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  conditionsHeader: { height: 112, paddingHorizontal: 16 },
  conditionsHeading: {
    height: 56,
    transform: [{ translateY: 26 }],
    color: palette.ink,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  conditionsContent: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  conditionsHelp: { color: palette.muted, fontSize: 15, lineHeight: 24 },
  conditionsCard: {
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    backgroundColor: palette.surface,
    elevation: 2,
  },
  conditionRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  conditionLabel: { flex: 1, color: palette.ink, fontSize: 17 },
  compactHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitle: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 44 },
  resultContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18,
  },
  predictionCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    backgroundColor: palette.surface,
    elevation: 4,
  },
  peakCopy: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18 },
  peakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  peakValue: {
    color: '#B7653F',
    fontFamily: 'monospace',
    fontSize: 64,
    lineHeight: 76,
    fontWeight: '700',
  },
  peakDetail: { flex: 1, color: palette.body, fontSize: 15, lineHeight: 20 },
  peakDelta: { color: '#B7653F', fontSize: 15, fontWeight: '700' },
  axisLabels: {
    paddingHorizontal: 18,
    paddingTop: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: { color: palette.muted, fontSize: 12, fontWeight: '600' },
  legend: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: palette.body, fontSize: 11, fontWeight: '600' },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#B7653F',
  },
  legendMeal: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: palette.ink,
    borderRadius: 7,
    backgroundColor: '#F4C63F',
  },
  legendTarget: {
    width: 22,
    height: 14,
    borderRadius: 2,
    backgroundColor: palette.targetBand,
  },
  legendPeak: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: palette.ink,
    borderRadius: 7,
    backgroundColor: palette.surface,
  },
  foodImpactCard: {
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    backgroundColor: palette.surface,
  },
  impactRow: { minHeight: 98, flexDirection: 'row', alignItems: 'center' },
  impactFoodName: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  impactFoodMeta: { marginTop: 2, color: palette.muted, fontSize: 15 },
  impactDelta: {
    color: '#B7653F',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
  },
  worthKnowing: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#D9C25F',
    borderRadius: 24,
    gap: 8,
    backgroundColor: palette.goldBackground,
  },
  worthKnowingText: { color: palette.ink, fontSize: 17, lineHeight: 24 },
  disclaimer: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  resultActions: { flexDirection: 'row', gap: 10 },
});
