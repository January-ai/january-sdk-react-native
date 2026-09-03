import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, serifFont, sharedStyles } from './demoTheme';

type RestaurantMode = 'restaurants' | 'menu';
type ResultState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface RestaurantFixture {
  id: string;
  name: string;
  city: string;
  address: string;
  distanceMiles: number;
}

interface MenuFixture {
  id: string;
  name: string;
  restaurantName: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

const fixtureRestaurant: RestaurantFixture = {
  id: 'fixture-cafe',
  name: 'Fixture Cafe',
  city: 'San Francisco',
  address: '123 Test Street',
  distanceMiles: 0.7,
};

const fixtureMenuItem: MenuFixture = {
  id: '100',
  name: 'Fixture bowl',
  restaurantName: 'Fixture Cafe',
  calories: 100,
  protein: 4,
  carbohydrates: 20,
  fat: 2,
};

export function RestaurantScreens({
  configured,
  onSettings,
  onSwitchFoods,
}: {
  configured: boolean;
  onSettings: () => void;
  onSwitchFoods: () => void;
}) {
  const [mode, setMode] = useState<RestaurantMode>('restaurants');
  const [query, setQuery] = useState('');
  const [resultState, setResultState] = useState<ResultState>('idle');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantFixture>();
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuFixture>();
  const [menuState, setMenuState] = useState<ResultState>('success');

  if (selectedMenuItem) {
    return (
      <MenuItemDetail
        item={selectedMenuItem}
        onBack={() => setSelectedMenuItem(undefined)}
      />
    );
  }

  if (selectedRestaurant) {
    return (
      <RestaurantDetail
        menuState={menuState}
        onBack={() => setSelectedRestaurant(undefined)}
        onMenuItem={setSelectedMenuItem}
        onRetry={() => setMenuState('success')}
        restaurant={selectedRestaurant}
      />
    );
  }

  const submit = () => {
    if (!query.trim() || !configured) return;
    Keyboard.dismiss();
    setResultState('loading');
    const normalized = query.toLowerCase();
    setTimeout(() => {
      if (normalized.includes('error')) setResultState('error');
      else if (normalized.includes('empty')) setResultState('empty');
      else setResultState('success');
    }, 4000);
  };

  const openRestaurant = () => {
    const normalized = query.toLowerCase();
    if (normalized.includes('menu error')) setMenuState('error');
    else if (normalized.includes('menu empty')) setMenuState('empty');
    else if (normalized.includes('menu loading')) {
      setMenuState('loading');
      setTimeout(() => setMenuState('success'), 1800);
    } else setMenuState('success');
    setSelectedRestaurant(fixtureRestaurant);
  };

  return (
    <View style={sharedStyles.screen} testID="restaurant-search-screen">
      <SearchHeader onSettings={onSettings} />
      <ScrollView
        contentContainerStyle={styles.searchContent}
        keyboardShouldPersistTaps="handled"
        testID="restaurant-search-content"
      >
        <View style={styles.searchField}>
          <MaterialCommunityIcons
            color={palette.muted}
            name="magnify"
            size={23}
          />
          <TextInput
            accessibilityLabel="Search restaurants"
            autoCapitalize="none"
            onChangeText={(value) => {
              setQuery(value);
              setResultState('idle');
            }}
            onSubmitEditing={submit}
            placeholder={
              mode === 'restaurants' ? 'Restaurant name' : 'Dish or restaurant'
            }
            placeholderTextColor={palette.subdued}
            returnKeyType="search"
            style={styles.searchInput}
            testID="restaurant-search-input"
            value={query}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              testID="restaurant-search-clear"
            >
              <MaterialCommunityIcons
                color={palette.subdued}
                name="close-circle"
                size={21}
              />
            </Pressable>
          ) : null}
        </View>

        <Segmented
          items={[
            { id: 'foods', label: 'Foods' },
            { id: 'restaurants', label: 'Restaurants' },
          ]}
          onSelect={(id) => id === 'foods' && onSwitchFoods()}
          selected="restaurants"
          testPrefix="search-scope"
        />
        <Segmented
          items={[
            { id: 'restaurants', label: 'Restaurants' },
            { id: 'menu', label: 'Menu items' },
          ]}
          onSelect={(id) => {
            setMode(id as RestaurantMode);
            setResultState('idle');
          }}
          selected={mode}
          testPrefix="restaurant-mode"
        />

        <Pressable
          onPress={() => setShowFilters(true)}
          style={styles.locationCard}
          testID="restaurant-filters-button"
        >
          <MaterialIcons color={palette.green} name="location-on" size={23} />
          <View style={styles.flexCopy}>
            <Text style={styles.rowTitle}>Search location</Text>
            <Text style={styles.microcopy}>
              Preset city · San Francisco, CA
            </Text>
          </View>
          <Text style={styles.rowMeta}>5.0 mi</Text>
          <MaterialIcons
            color={palette.subdued}
            name="chevron-right"
            size={22}
          />
        </Pressable>

        {!query.trim() ? (
          <View style={styles.emptyCard} testID="restaurants-initial">
            <MaterialCommunityIcons
              color={palette.green}
              name="silverware-fork-knife"
              size={25}
            />
            <Text style={styles.emptyTitle}>Search nearby</Text>
            <Text style={styles.emptyBody}>
              Find restaurants or dishes around a location.
            </Text>
          </View>
        ) : null}

        <Pressable
          disabled={!configured || resultState === 'loading'}
          onPress={submit}
          style={[
            sharedStyles.primaryButton,
            !configured && sharedStyles.disabled,
          ]}
          testID="restaurant-search-submit"
        >
          {resultState === 'loading' ? (
            <View style={styles.loadingRow} testID="restaurants-loading">
              <ActivityIndicator color={palette.paper} size="small" />
              <Text style={sharedStyles.primaryText}>Searching nearby</Text>
            </View>
          ) : (
            <Text style={sharedStyles.primaryText}>Search nearby</Text>
          )}
        </Pressable>

        {resultState === 'error' ? (
          <RequestError onRetry={submit} testID="restaurants-error" />
        ) : resultState === 'empty' ? (
          <EmptyState
            body="Try another name, location, or search radius."
            testID="restaurants-empty"
            title="No nearby matches"
          />
        ) : resultState === 'success' && mode === 'restaurants' ? (
          <View style={styles.results} testID="restaurant-results">
            <Text style={styles.resultHeading}>Nearby restaurants</Text>
            <Pressable
              onPress={openRestaurant}
              style={styles.resultCard}
              testID="restaurant-result-0"
            >
              <View style={styles.resultIcon}>
                <MaterialIcons
                  color={palette.green}
                  name="restaurant"
                  size={24}
                />
              </View>
              <View style={styles.flexCopy}>
                <Text style={styles.resultTitle}>Fixture Cafe</Text>
                <Text style={styles.resultMeta}>123 Test Street · 0.7 mi</Text>
              </View>
              <MaterialIcons
                color={palette.subdued}
                name="chevron-right"
                size={22}
              />
            </Pressable>
          </View>
        ) : resultState === 'success' ? (
          <View style={styles.results} testID="menu-results">
            <Text style={styles.resultHeading}>Nearby menu items</Text>
            <Pressable
              onPress={() => setSelectedMenuItem(fixtureMenuItem)}
              style={styles.resultCard}
              testID="menu-result-0"
            >
              <View style={styles.resultIcon}>
                <MaterialCommunityIcons
                  color={palette.green}
                  name="silverware-fork-knife"
                  size={22}
                />
              </View>
              <View style={styles.flexCopy}>
                <Text style={styles.resultTitle}>Fixture bowl</Text>
                <Text style={styles.resultMeta}>Fixture Cafe · 100 cal</Text>
              </View>
              <MaterialIcons
                color={palette.subdued}
                name="chevron-right"
                size={22}
              />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <RestaurantFilters
        onClose={() => setShowFilters(false)}
        visible={showFilters}
      />
    </View>
  );
}

function SearchHeader({ onSettings }: { onSettings: () => void }) {
  return (
    <View style={styles.searchHeader}>
      <View style={styles.searchActions}>
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
      <Text style={styles.searchTitle}>Search</Text>
    </View>
  );
}

function Segmented({
  items,
  onSelect,
  selected,
  testPrefix,
}: {
  items: { id: string; label: string }[];
  onSelect: (id: string) => void;
  selected: string;
  testPrefix: string;
}) {
  return (
    <View style={styles.segmented}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item.id)}
          style={[
            styles.segment,
            selected === item.id && styles.segmentSelected,
          ]}
          testID={`${testPrefix}-${item.id}`}
        >
          <Text style={styles.segmentText}>{item.label}</Text>
        </Pressable>
      ))}
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
    <View style={styles.compactHeader}>
      <Pressable
        onPress={onBack}
        style={sharedStyles.iconButton}
        testID="detail-back"
      >
        <MaterialIcons color={palette.ink} name="chevron-left" size={28} />
      </Pressable>
      <Text style={styles.compactTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function RestaurantDetail({
  menuState,
  onBack,
  onMenuItem,
  onRetry,
  restaurant,
}: {
  menuState: ResultState;
  onBack: () => void;
  onMenuItem: (item: MenuFixture) => void;
  onRetry: () => void;
  restaurant: RestaurantFixture;
}) {
  return (
    <View style={sharedStyles.screen} testID="restaurant-detail-screen">
      <CompactHeader onBack={onBack} title="Restaurant" />
      <ScrollView contentContainerStyle={styles.detailContent}>
        <Text style={styles.detailTitle}>{restaurant.name}</Text>
        <View style={sharedStyles.card}>
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.betweenRow}>
            <Text style={styles.detailBody}>City</Text>
            <Text style={styles.detailMuted}>{restaurant.city}</Text>
          </View>
          <Text style={styles.detailBody}>{restaurant.address}</Text>
        </View>
        <Text style={styles.sectionLabel}>Menu items</Text>
        {menuState === 'loading' ? (
          <View
            style={[sharedStyles.card, styles.loadingCard]}
            testID="menu-loading"
          >
            <ActivityIndicator color={palette.green} size="small" />
            <Text style={styles.detailMuted}>Loading menu</Text>
          </View>
        ) : menuState === 'error' ? (
          <RequestError onRetry={onRetry} testID="menu-error" />
        ) : menuState === 'empty' ? (
          <EmptyState
            body="January did not return menu items for this restaurant."
            testID="menu-empty"
            title="No menu items found"
          />
        ) : (
          <Pressable
            onPress={() => onMenuItem(fixtureMenuItem)}
            style={styles.menuCard}
            testID="restaurant-menu-item-0"
          >
            <View style={styles.resultIcon}>
              <MaterialCommunityIcons
                color={palette.green}
                name="silverware-fork-knife"
                size={22}
              />
            </View>
            <View style={styles.flexCopy}>
              <Text style={styles.rowTitle}>Fixture bowl</Text>
              <Text style={styles.detailMuted}>Fixture Cafe</Text>
              <Text style={styles.detailMuted}>100 cal</Text>
            </View>
            <MaterialIcons
              color={palette.subdued}
              name="chevron-right"
              size={22}
            />
          </Pressable>
        )}
        <Text style={styles.disclosure}>Technical details　›</Text>
      </ScrollView>
    </View>
  );
}

function MenuItemDetail({
  item,
  onBack,
}: {
  item: MenuFixture;
  onBack: () => void;
}) {
  return (
    <View style={sharedStyles.screen} testID="menu-item-detail-screen">
      <CompactHeader onBack={onBack} title="Menu item" />
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.menuHero}>
          <MaterialCommunityIcons
            color={palette.green}
            name="silverware-fork-knife"
            size={50}
          />
        </View>
        <Text style={styles.detailTitle}>{item.name}</Text>
        <Text style={styles.restaurantName}>{item.restaurantName}</Text>
        <MacroCard item={item} />
        <View style={sharedStyles.card}>
          <NutritionRow label="Net carbohydrates" value="17 g" />
          <View style={sharedStyles.divider} />
          <NutritionRow label="Fiber" value="3 g" />
          <View style={sharedStyles.divider} />
          <NutritionRow label="Total sugars" value="4 g" />
        </View>
        <View style={sharedStyles.card}>
          <Text style={styles.sectionLabel}>Serving</Text>
          <Text style={styles.rowTitle}>1 bowl · 100 g</Text>
        </View>
        <Pressable
          style={sharedStyles.primaryButton}
          testID="menu-glucose-button"
        >
          <MaterialIcons color={palette.paper} name="monitor-heart" size={22} />
          <Text style={sharedStyles.primaryText}>See glucose impact</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MacroCard({ item }: { item: MenuFixture }) {
  const values = [
    ['Calories', `${item.calories} cal`],
    ['Protein', `${item.protein} g`],
    ['Carbs', `${item.carbohydrates} g`],
    ['Fat', `${item.fat} g`],
  ];
  return (
    <View style={styles.macroCard}>
      {values.map(([label, value]) => (
        <View key={label} style={styles.macroCell}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={styles.macroValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function NutritionRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.detailBody}>{label}</Text>
      <Text style={styles.detailMuted}>{value}</Text>
    </View>
  );
}

function EmptyState({
  body,
  testID,
  title,
}: {
  body: string;
  testID: string;
  title: string;
}) {
  return (
    <View style={styles.emptyCard} testID={testID}>
      <MaterialCommunityIcons
        color={palette.green}
        name="silverware-fork-knife"
        size={25}
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function RequestError({
  onRetry,
  testID,
}: {
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
      <Text style={styles.errorBody}>
        The test request could not be completed.
      </Text>
      <Text style={styles.disclosure}>Technical details　›</Text>
      <Pressable onPress={onRetry} testID={`${testID}-retry`}>
        <Text style={styles.retry}>Try again</Text>
      </Pressable>
    </View>
  );
}

function RestaurantFilters({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [limit, setLimit] = useState(10);
  useEffect(() => {
    if (!visible) setLimit(10);
  }, [visible]);
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <View
          style={[styles.filterSheet, { paddingTop: insets.top + 42 }]}
          testID="restaurant-filters"
        >
          <View style={[styles.handle, { top: insets.top + 16 }]} />
          <View style={styles.filterHeader}>
            <Pressable
              onPress={onClose}
              style={sharedStyles.iconButton}
              testID="restaurant-filters-close"
            >
              <MaterialIcons color={palette.ink} name="close" size={24} />
            </Pressable>
            <Text style={styles.filterTitle}>Search filters</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.filterContent}>
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={sharedStyles.card}>
              <View style={styles.locationAccessRow}>
                <MaterialIcons
                  color={palette.green}
                  name="location-on"
                  size={22}
                />
                <View>
                  <Text style={styles.rowTitle}>Location access</Text>
                  <Text style={styles.microcopy}>
                    Location access not granted
                  </Text>
                </View>
              </View>
              <View style={sharedStyles.divider} />
              <View style={styles.betweenRow}>
                <Text style={styles.rowTitle}>Search city</Text>
                <Text style={styles.greenMeta}>San Francisco, CA　⌃</Text>
              </View>
              <View style={sharedStyles.divider} />
              <View style={styles.betweenRow}>
                <Text style={styles.rowTitle}>Coordinates</Text>
                <Text style={styles.detailMuted}>37.775, -122.419</Text>
              </View>
            </View>
            <Pressable style={sharedStyles.secondaryButton}>
              <MaterialIcons color={palette.ink} name="location-on" size={21} />
              <Text style={sharedStyles.secondaryText}>
                Use my current location
              </Text>
            </Pressable>
            <Text style={styles.sectionLabel}>Search radius</Text>
            <View style={sharedStyles.card}>
              <View style={styles.betweenRow}>
                <Text style={styles.rowTitle}>Nearby distance</Text>
                <Text style={styles.greenMeta}>5.0 mi</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={styles.sliderFill} />
                <View style={styles.sliderThumb} />
              </View>
              <Text style={styles.microcopy}>
                Search within 8,000 meters of the selected location.
              </Text>
            </View>
            <Text style={styles.sectionLabel}>Results</Text>
            <View style={[sharedStyles.card, styles.limitRow]}>
              <View style={styles.flexCopy}>
                <Text style={styles.rowTitle}>Maximum results</Text>
                <Text style={styles.microcopy}>
                  Up to {limit} nearby matches
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setLimit(Math.max(1, limit - 1))}
                  style={styles.stepButton}
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Pressable
                  onPress={() => setLimit(Math.min(100, limit + 1))}
                  style={styles.stepButton}
                >
                  <Text style={styles.stepText}>＋</Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={sharedStyles.primaryButton}
              testID="restaurant-filters-apply"
            >
              <Text style={sharedStyles.primaryText}>Apply filters</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchHeader: { height: 112 },
  searchActions: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchTitle: {
    paddingHorizontal: 16,
    color: palette.ink,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  searchContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 18,
  },
  searchField: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.control,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 24,
  },
  segmented: {
    minHeight: 36,
    padding: 2,
    borderRadius: 20,
    flexDirection: 'row',
    backgroundColor: '#EAE8E5',
  },
  segment: {
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
  locationCard: {
    minHeight: 78,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
  },
  flexCopy: { flex: 1, gap: 3 },
  rowTitle: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  microcopy: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  rowMeta: { color: palette.body, fontSize: 13 },
  greenMeta: { color: palette.green, fontFamily: 'monospace', fontSize: 12 },
  emptyCard: {
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
  emptyTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 30,
  },
  emptyBody: {
    color: palette.body,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  results: { gap: 12 },
  resultHeading: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  resultCard: {
    minHeight: 92,
    padding: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
  },
  resultIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  resultTitle: { color: palette.ink, fontSize: 17, fontWeight: '600' },
  resultMeta: { color: palette.muted, fontSize: 13 },
  compactHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 44 },
  detailContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 18,
  },
  detailTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  sectionLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailBody: { color: palette.ink, fontSize: 15, lineHeight: 21 },
  detailMuted: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  betweenRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  loadingCard: { flexDirection: 'row', alignItems: 'center' },
  menuCard: {
    minHeight: 102,
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
  },
  disclosure: { color: palette.body, fontSize: 13, lineHeight: 20 },
  menuHero: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  restaurantName: { marginTop: -12, color: palette.muted, fontSize: 16 },
  macroCard: {
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: palette.surface,
  },
  macroCell: { width: '50%', minHeight: 78, gap: 4 },
  macroLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  macroValue: { color: palette.ink, fontSize: 18, fontWeight: '600' },
  nutritionRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  retry: {
    paddingVertical: 6,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29,26,20,0.45)',
  },
  filterSheet: {
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
  filterHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  filterContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 32,
    gap: 20,
  },
  locationAccessRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  limitRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center' },
  sliderTrack: {
    height: 4,
    marginVertical: 10,
    borderRadius: 2,
    backgroundColor: palette.controlStrong,
  },
  sliderFill: {
    width: '44%',
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.green,
  },
  sliderThumb: {
    position: 'absolute',
    top: -10,
    left: '42%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.surface,
    elevation: 3,
  },
  stepper: {
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: palette.control,
  },
  stepButton: { width: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: palette.ink, fontSize: 20 },
});
