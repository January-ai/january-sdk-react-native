import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  FoodSearchItem,
  FoodSelection,
  JanuaryClient,
  ServingOption,
} from '@januaryai/react-native';

import { palette, serifFont, sharedStyles } from './demoTheme';
import { searchFixtureFoods } from './e2eFixtures';

export interface SelectedFood {
  item: FoodSearchItem;
  selection: FoodSelection;
}

interface FoodPickerSheetProps {
  client: JanuaryClient;
  fixtures: boolean;
  onClose: () => void;
  onSelect: (food: SelectedFood) => void;
  visible: boolean;
}

export function FoodPickerSheet({
  client,
  fixtures,
  onClose,
  onSelect,
  visible,
}: FoodPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [hasSearched, setHasSearched] = useState(false);
  const [chosenFood, setChosenFood] = useState<FoodSearchItem>();

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setItems([]);
      setError(undefined);
      setHasSearched(false);
      setChosenFood(undefined);
    }
  }, [visible]);

  async function search() {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    setError(undefined);
    try {
      const result = fixtures
        ? await searchFixtureFoods(query)
        : await client.foods.search({ query, limit: 10 });
      setItems(result.items);
    } catch (caught) {
      setItems([]);
      setError(
        caught instanceof Error ? caught.message : 'Food search failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <View
          style={[
            styles.sheet,
            {
              paddingTop: Math.max(insets.top, 20) + 48,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
          testID="food-picker"
        >
          <SheetHeader onClose={onClose} title="Add food" />
          <View style={styles.searchField}>
            <MaterialCommunityIcons
              color={palette.body}
              name="magnify"
              size={24}
            />
            <TextInput
              accessibilityLabel="Search food to add"
              autoCapitalize="none"
              onChangeText={(value) => {
                setQuery(value);
                if (!value) {
                  setItems([]);
                  setError(undefined);
                  setHasSearched(false);
                }
              }}
              onSubmitEditing={() => search().catch(() => undefined)}
              placeholder="Search foods"
              placeholderTextColor={palette.body}
              returnKeyType="search"
              style={styles.searchInput}
              testID="food-picker-input"
              value={query}
            />
            {query ? (
              <Pressable
                accessibilityLabel="Clear food search"
                hitSlop={10}
                onPress={() => {
                  setQuery('');
                  setItems([]);
                  setError(undefined);
                  setHasSearched(false);
                }}
              >
                <MaterialCommunityIcons
                  color={palette.subdued}
                  name="close-circle"
                  size={21}
                />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loading} testID="food-picker-loading">
              <ActivityIndicator color={palette.green} />
            </View>
          ) : error ? (
            <View
              accessibilityRole="alert"
              style={styles.errorCard}
              testID="food-picker-error"
            >
              <Text style={sharedStyles.errorTitle}>Couldn’t load foods</Text>
              <Text style={sharedStyles.errorText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => search().catch(() => undefined)}
                style={sharedStyles.secondaryButton}
                testID="food-picker-retry"
              >
                <Text style={sharedStyles.secondaryText}>Try again</Text>
              </Pressable>
            </View>
          ) : hasSearched && items.length === 0 ? (
            <EmptyState
              description="Try another name or broaden your search."
              testID="food-picker-empty"
              title="No foods found"
            />
          ) : items.length === 0 ? (
            <EmptyState
              description="Start typing for suggestions, or search January’s food database."
              title="Find a food"
            />
          ) : (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionLabel}>
                RESULTS · JANUARY FOOD DATABASE
              </Text>
              <ScrollView
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                style={styles.resultsScroller}
              >
                <View style={styles.resultsCard}>
                  {items.map((item, index) => (
                    <View key={item.id}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setChosenFood(item)}
                        style={styles.foodRow}
                        testID={`food-picker-result-${index}`}
                      >
                        <View style={styles.foodIcon}>
                          <MaterialIcons
                            color={palette.green}
                            name="restaurant-menu"
                            size={21}
                          />
                        </View>
                        <View style={styles.foodCopy}>
                          <Text style={styles.foodName}>
                            {item.name ?? 'Unnamed food'}
                          </Text>
                          {item.brandName ? (
                            <Text style={styles.foodBrand}>
                              {item.brandName}
                            </Text>
                          ) : null}
                          <Text style={styles.foodMeta}>
                            {item.calories != null
                              ? `${Math.round(item.calories)} cal`
                              : 'Nutrition available'}
                            {primaryServing(item)
                              ? ` · ${servingName(primaryServing(item)!)} `
                              : ''}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          color={palette.subdued}
                          name="chevron-right"
                          size={22}
                        />
                      </Pressable>
                      {index < items.length - 1 ? (
                        <View style={styles.divider} />
                      ) : null}
                    </View>
                  ))}
                </View>
                <Text style={styles.photoNote}>
                  Photos load from January’s food database.
                </Text>
              </ScrollView>
            </View>
          )}
          {chosenFood ? (
            <View style={styles.nestedOverlay}>
              <Pressable
                accessibilityLabel="Close Choose serving"
                onPress={() => setChosenFood(undefined)}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.nestedSheet,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}
              >
                <ServingSelection
                  food={chosenFood}
                  onBack={() => setChosenFood(undefined)}
                  onSelect={(selection) => {
                    onSelect(selection);
                    onClose();
                  }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetHeader({
  onClose,
  title,
}: {
  onClose: () => void;
  title: string;
}) {
  return (
    <View style={styles.sheetHeader}>
      <Pressable
        accessibilityLabel={`Close ${title}`}
        onPress={onClose}
        style={styles.closeButton}
        testID="food-picker-close"
      >
        <MaterialCommunityIcons color={palette.ink} name="close" size={26} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.sheetTitle}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function EmptyState({
  description,
  testID,
  title,
}: {
  description: string;
  testID?: string;
  title: string;
}) {
  return (
    <View style={styles.emptyCard} testID={testID}>
      <MaterialIcons color={palette.green} name="restaurant-menu" size={24} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function ServingSelection({
  food,
  onBack,
  onSelect,
}: {
  food: FoodSearchItem;
  onBack: () => void;
  onSelect: (food: SelectedFood) => void;
}) {
  const servings = food.servings.filter((serving) => serving.id);
  const [serving, setServing] = useState<ServingOption>(
    () =>
      primaryServing(food) ??
      servings[0] ?? { id: '', quantity: 1, scalingFactor: 1, unit: 'serving' }
  );
  const [quantity, setQuantity] = useState(1);
  const [showServings, setShowServings] = useState(false);
  const scale = (quantity * serving.scalingFactor) / (serving.quantity || 1);
  return (
    <View style={styles.servingRoot} testID="food-serving-sheet">
      <View style={styles.sheetHeader}>
        <Pressable
          accessibilityLabel="Back to food results"
          onPress={onBack}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons color={palette.ink} name="close" size={26} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          Choose serving
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.servingFoodName}>{food.name ?? 'Unnamed food'}</Text>
      <View style={styles.servingCard}>
        <Pressable
          onPress={() => setShowServings((value) => !value)}
          style={styles.servingRow}
        >
          <Text style={styles.servingRowTitle}>Serving</Text>
          <Text style={styles.servingValue}>{servingName(serving)}</Text>
          <MaterialCommunityIcons
            color={palette.goldText}
            name="menu-down"
            size={22}
          />
        </Pressable>
        {showServings
          ? servings.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  setServing(option);
                  setShowServings(false);
                }}
                style={styles.servingOption}
              >
                <Text style={styles.foodName}>{servingName(option)}</Text>
              </Pressable>
            ))
          : null}
        <View style={styles.divider} />
        <View style={styles.servingRow}>
          <Text style={styles.servingRowTitle}>Quantity</Text>
          <RoundQuantityButton
            onPress={() => setQuantity(Math.max(0.25, quantity - 0.25))}
            symbol="−"
          />
          <Text style={styles.servingQuantity}>{formatNumber(quantity)}</Text>
          <RoundQuantityButton
            onPress={() => setQuantity(quantity + 0.25)}
            primary
            symbol="+"
          />
        </View>
      </View>
      <View style={styles.metrics}>
        <Metric
          label="Calories"
          unit="cal"
          value={food.calories == null ? undefined : food.calories * scale}
        />
        <Metric
          label="Carbs"
          unit="g"
          value={
            food.carbohydrates == null ? undefined : food.carbohydrates * scale
          }
        />
        <Metric
          label="Protein"
          unit="g"
          value={food.protein == null ? undefined : food.protein * scale}
        />
        <Metric
          label="Fat"
          unit="g"
          value={food.totalFat == null ? undefined : food.totalFat * scale}
        />
      </View>
      <Pressable
        disabled={!serving.id}
        onPress={() =>
          serving.id &&
          onSelect({
            item: food,
            selection: { id: food.id, serving: { id: serving.id, quantity } },
          })
        }
        style={[
          sharedStyles.primaryButton,
          !serving.id && sharedStyles.disabled,
        ]}
        testID="food-serving-add"
      >
        <Text style={sharedStyles.primaryText}>Add to meal</Text>
      </Pressable>
    </View>
  );
}

function RoundQuantityButton({
  onPress,
  primary = false,
  symbol,
}: {
  onPress: () => void;
  primary?: boolean;
  symbol: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roundQuantity, primary && styles.roundQuantityPrimary]}
    >
      <Text
        style={[
          styles.roundQuantityText,
          primary && styles.roundQuantityTextPrimary,
        ]}
      >
        {symbol}
      </Text>
    </Pressable>
  );
}

function Metric({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value?: number;
}) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>
          {value == null ? '—' : formatNumber(value)}
        </Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function primaryServing(food: FoodSearchItem): ServingOption | undefined {
  return (
    food.servings.find((serving) => serving.isPrimary && serving.id) ??
    food.servings.find((serving) => serving.id)
  );
}
function servingName(serving: ServingOption): string {
  return `${formatNumber(serving.quantity ?? 1)} ${serving.unit ?? 'serving'}`;
}
function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29,26,20,0.48)',
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
    top: 14,
    left: '50%',
    width: 32,
    height: 5,
    marginLeft: -16,
    borderRadius: 3,
    backgroundColor: palette.body,
  },
  nestedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(29,26,20,0.32)',
  },
  nestedSheet: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '50%',
    paddingTop: 45,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.paper,
  },
  nestedHandle: {
    position: 'absolute',
    top: 23,
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  sheetTitle: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 44 },
  searchField: {
    minHeight: 58,
    marginHorizontal: 16,
    marginTop: 28,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.control,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: palette.body,
    fontSize: 17,
  },
  loading: { padding: 24, alignItems: 'center' },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    gap: 8,
    backgroundColor: palette.rustBackground,
  },
  emptyCard: {
    minHeight: 178,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.surface,
  },
  emptyTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
  },
  emptyDescription: {
    maxWidth: 310,
    color: palette.body,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  resultsSection: { flex: 1, marginTop: 16, gap: 10 },
  sectionLabel: {
    paddingHorizontal: 22,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.15,
  },
  resultsScroller: { flex: 1 },
  resultsCard: {
    marginHorizontal: 16,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    backgroundColor: palette.surface,
  },
  foodRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  foodCopy: { flex: 1, gap: 2 },
  foodName: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  foodBrand: { color: palette.muted, fontSize: 14 },
  foodMeta: { color: palette.muted, fontSize: 14 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  photoNote: {
    marginHorizontal: 16,
    paddingVertical: 12,
    color: palette.muted,
    fontSize: 14,
  },
  servingRoot: { flex: 1, paddingHorizontal: 16, gap: 15 },
  servingFoodName: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
  },
  servingCard: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 24,
    backgroundColor: palette.paper,
  },
  servingRow: {
    minHeight: 73,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingRowTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  servingValue: { color: palette.goldText, fontSize: 15, fontWeight: '600' },
  servingOption: {
    minHeight: 48,
    paddingHorizontal: 22,
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  servingQuantity: {
    width: 50,
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 26,
    textAlign: 'center',
  },
  roundQuantity: {
    width: 56,
    height: 56,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  roundQuantityPrimary: {
    borderColor: palette.ink,
    backgroundColor: palette.ink,
  },
  roundQuantityText: { color: palette.ink, fontSize: 28 },
  roundQuantityTextPrimary: { color: palette.paper },
  metrics: {
    marginTop: -2,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  metricValue: {
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: '600',
  },
  metricUnit: { color: palette.muted, fontSize: 11 },
});
