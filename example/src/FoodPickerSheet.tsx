import { MaterialCommunityIcons } from '@expo/vector-icons';
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
} from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
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

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setItems([]);
      setError(undefined);
      setHasSearched(false);
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
      setError(
        caught instanceof Error ? caught.message : 'Food search failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  function choose(item: FoodSearchItem) {
    const serving =
      item.servings.find((candidate) => candidate.isPrimary && candidate.id) ??
      item.servings.find((candidate) => candidate.id);
    if (!serving?.id) {
      setError('This result does not contain a selectable serving.');
      return;
    }
    onSelect({
      item,
      selection: { id: item.id, serving: { id: serving.id, quantity: 1 } },
    });
    onClose();
  }

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
        keyboardVerticalOffset={0}
        style={sharedStyles.modalRoot}
      >
        <Pressable
          accessibilityLabel="Close food picker"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            sharedStyles.sheet,
            styles.keyboardSafeSheet,
            { paddingBottom: insets.bottom + 20 },
          ]}
          testID="food-picker"
        >
          <View style={sharedStyles.sheetHeader}>
            <Text accessibilityRole="header" style={sharedStyles.sheetTitle}>
              Add food
            </Text>
            <Pressable
              accessibilityLabel="Close food picker"
              accessibilityRole="button"
              onPress={onClose}
              style={sharedStyles.iconButton}
              testID="food-picker-close"
            >
              <MaterialCommunityIcons
                color={palette.ink}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="Search food to add"
              autoCapitalize="none"
              onChangeText={setQuery}
              onSubmitEditing={() => search().catch(() => undefined)}
              placeholder="Food name"
              placeholderTextColor={palette.subdued}
              returnKeyType="search"
              style={[sharedStyles.input, styles.searchInput]}
              testID="food-picker-input"
              value={query}
            />
            <Pressable
              accessibilityLabel="Search food picker"
              accessibilityRole="button"
              disabled={!query.trim() || loading}
              onPress={() => search().catch(() => undefined)}
              style={[sharedStyles.primaryButton, styles.searchButton]}
              testID="food-picker-search"
            >
              {loading ? (
                <View collapsable={false} testID="food-picker-loading">
                  <ActivityIndicator color={palette.paper} />
                </View>
              ) : (
                <MaterialCommunityIcons
                  color={palette.paper}
                  name="magnify"
                  size={22}
                />
              )}
            </Pressable>
          </View>

          {error ? (
            <View
              accessibilityRole="alert"
              style={sharedStyles.error}
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
          ) : null}

          {hasSearched && !loading && !error && items.length === 0 ? (
            <View style={styles.empty} testID="food-picker-empty">
              <Text style={sharedStyles.cardTitle}>No foods found</Text>
              <Text style={sharedStyles.body}>Try a different food name.</Text>
            </View>
          ) : null}

          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            style={styles.resultsScroller}
          >
            <View style={styles.results}>
              {items.map((item, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() => choose(item)}
                  style={({ pressed }) => [
                    styles.foodRow,
                    pressed && sharedStyles.pressed,
                  ]}
                  testID={`food-picker-result-${index}`}
                >
                  <View style={styles.foodIcon}>
                    <MaterialCommunityIcons
                      color={palette.green}
                      name="silverware-fork-knife"
                      size={20}
                    />
                  </View>
                  <View style={styles.foodCopy}>
                    <Text style={styles.foodName}>
                      {item.name ?? 'Unnamed food'}
                    </Text>
                    <Text style={styles.foodMeta}>
                      {item.calories != null
                        ? `${Math.round(item.calories)} cal`
                        : 'Nutrition available'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    color={palette.subdued}
                    name="plus"
                    size={22}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: { flex: 1 },
  searchButton: { width: 56, minHeight: 54, paddingHorizontal: 0 },
  keyboardSafeSheet: { height: '90%' },
  resultsScroller: { flex: 1 },
  results: { gap: 10 },
  foodRow: {
    minHeight: 76,
    padding: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
  },
  foodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  foodCopy: { flex: 1, gap: 3 },
  foodName: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  foodMeta: { color: palette.muted, fontSize: 13 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 24 },
});
