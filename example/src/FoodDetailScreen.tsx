import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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

import type { FoodSearchItem } from '@januaryai/react-native';

import { palette, serifFont, sharedStyles } from './demoTheme';

export function FoodDetailScreen({
  food,
  onBack,
}: {
  food: FoodSearchItem;
  onBack: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showGlucose, setShowGlucose] = useState(false);
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

        <View style={styles.card} testID="food-serving-controls">
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
      </ScrollView>
      <FoodGlucoseSheet
        food={food}
        onClose={() => setShowGlucose(false)}
        quantity={quantity}
        serving={`${formatNumber(servingQuantity)} ${servingUnit}`}
        visible={showGlucose}
      />
      <AlternativesSheet
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
              paddingTop: insets.top + 43,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { top: insets.top + 18 }]} />
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
  food,
  onClose,
  quantity,
  serving,
  visible,
}: {
  food: FoodSearchItem;
  onClose: () => void;
  quantity: number;
  serving: string;
  visible: boolean;
}) {
  return (
    <FullSheet onClose={onClose} title="Glucose response" visible={visible}>
      <ScrollView contentContainerStyle={styles.sheetContent}>
        <Text style={styles.foodName}>{food.name ?? 'Unnamed food'}</Text>
        <Text style={styles.brand}>{serving}</Text>
        <View style={styles.impactBanner}>
          <MaterialIcons color="#F4C63F" name="monitor-heart" size={25} />
          <Text style={styles.impactTitle}>Medium impact</Text>
          <Text style={styles.impactCaption}>Estimated impact</Text>
        </View>
        <View style={styles.glucoseChart}>
          <View style={styles.chartHeading}>
            <Text style={styles.label}>PREDICTED RESPONSE</Text>
            <Text style={styles.chartUnit}>mg/dL</Text>
          </View>
          <Text style={styles.peakCaption}>Likely peak 140 · +60 min</Text>
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
          <View style={styles.glucoseMetric}>
            <Text style={styles.smallLabel}>Peak</Text>
            <Text style={styles.glucoseMetricValue}>140 mg/dL</Text>
          </View>
          <View style={styles.glucoseMetric}>
            <Text style={styles.smallLabel}>Target minimum</Text>
            <Text style={styles.glucoseMetricValue}>70 mg/dL</Text>
          </View>
          <View style={styles.glucoseMetric}>
            <Text style={styles.smallLabel}>Target maximum</Text>
            <Text style={styles.glucoseMetricValue}>140 mg/dL</Text>
          </View>
          <View style={styles.glucoseMetric}>
            <Text style={styles.smallLabel}>Data points</Text>
            <Text style={styles.glucoseMetricValue}>
              {Math.max(5, Math.round(quantity * 5))}
            </Text>
          </View>
        </View>
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
  food,
  onClose,
  visible,
}: {
  food: FoodSearchItem;
  onClose: () => void;
  visible: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  function toggle(value: string) {
    setSelected((values) =>
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
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
          <Text style={styles.foodName}>{food.name ?? 'Unnamed food'}</Text>
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
          onPress={() => setShowResults(true)}
          style={sharedStyles.primaryButton}
          testID="alternatives-refresh"
        >
          <MaterialIcons color={palette.paper} name="eco" size={22} />
          <Text style={sharedStyles.primaryText}>
            {showResults ? 'Refresh alternatives' : 'Find alternatives'}
          </Text>
        </Pressable>
        {showResults ? (
          <View style={styles.alternativeResults}>
            <Text style={styles.label}>SUGGESTIONS · 1</Text>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Steel-cut oats</Text>
              <Text style={styles.brand}>
                A similar whole-grain option matched to your preferences.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </FullSheet>
  );
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
    gap: 18,
    backgroundColor: palette.surface,
  },
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
  quantityLabel: { color: palette.ink, fontSize: 17 },
  stepper: {
    height: 54,
    paddingHorizontal: 6,
    borderRadius: 14,
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
  suggestionIntro: {
    padding: 22,
    borderRadius: 24,
    gap: 10,
    backgroundColor: palette.surface,
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
});
