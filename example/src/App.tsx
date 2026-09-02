import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  FoodCategory,
  JanuaryClient,
  getNativeModuleVersion,
  type FoodCategoryValue,
  type FoodSearchItem,
  type JanuaryClientToken,
} from '@januaryai/react-native';

import { searchFixtureFoods } from './e2eFixtures';
import { FoodLogsScreen } from './FoodLogsScreen';
import { GlucoseScreen } from './GlucoseScreen';
import { ScanScreen } from './ScanScreen';

const tokenEndpoint = process.env.EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT;
const developmentApiKey = process.env.EXPO_PUBLIC_JANUARY_API_KEY;
const e2eFixturesEnabled = process.env.EXPO_PUBLIC_E2E_FIXTURES === '1';
const sessionToken = process.env.EXPO_PUBLIC_DEMO_SESSION_TOKEN;
const endUserId =
  process.env.EXPO_PUBLIC_DEMO_END_USER_ID ?? 'react-native-demo-user';

const palette = {
  paper: '#FAF8F2',
  surface: '#FFFFFF',
  ink: '#1D1A14',
  body: '#3E3A2E',
  muted: '#55503F',
  subdued: '#8F887A',
  border: '#E0DACB',
  divider: '#F1EDE2',
  control: '#F3F0E7',
  controlStrong: '#EBE5D8',
  green: '#54724F',
  targetBand: '#F0F3EA',
  goldText: '#6E5613',
  goldBackground: '#FBF0CB',
  rustText: '#8C4A2F',
  rustBackground: '#FAEBE1',
} as const;

const serifFont = Platform.select({ android: 'serif', ios: 'Georgia' });

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoScreen />
    </SafeAreaProvider>
  );
}

function DemoScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategoryValue>();
  const [results, setResults] = useState<FoodSearchItem[]>([]);
  const [error, setError] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('search');
  const nativeVersion = getNativeModuleVersion();

  const client = useMemo(
    () =>
      new JanuaryClient(
        developmentApiKey
          ? {
              developmentApiKey,
              endUserId,
              timezone: 'America/New_York',
            }
          : {
              endUserId,
              timezone: 'America/New_York',
              clientTokenProvider: fetchClientToken,
            }
      ),
    []
  );

  useEffect(() => () => client.dispose(), [client]);

  const search = useCallback(async () => {
    const value = query.trim();
    if (!value) return;
    Keyboard.dismiss();
    setIsSearching(true);
    setHasSearched(true);
    setError(undefined);
    try {
      const response = e2eFixturesEnabled
        ? await searchFixtureFoods(value, category)
        : await client.foods.search({
            query: value,
            category,
            limit: 10,
          });
      setResults(response.items);
    } catch (caught) {
      setResults([]);
      setError(
        caught instanceof Error ? caught.message : 'Food search failed.'
      );
    } finally {
      setIsSearching(false);
    }
  }, [category, client, query]);

  const configured = Boolean(
    e2eFixturesEnabled || developmentApiKey || tokenEndpoint
  );

  return (
    <View style={styles.root} testID="app-root">
      <StatusBar style="dark" />
      <View style={{ height: insets.top }} />

      {developmentApiKey ? <DevelopmentBanner /> : null}

      {activeTab === 'search' ? (
        <View style={styles.screenBody} testID="search-screen">
          <View style={styles.navigationRow}>
            <Text
              accessibilityRole="header"
              style={styles.screenTitle}
              testID="search-title"
            >
              Search
            </Text>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowSettings(true)}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
              testID="settings-button"
            >
              <MaterialCommunityIcons
                color={palette.ink}
                name="tune-variant"
                size={22}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <SearchField
              onChangeText={(value) => {
                setQuery(value);
                setHasSearched(false);
                setResults([]);
                setError(undefined);
              }}
              onClear={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
                setError(undefined);
              }}
              onSubmit={() => {
                if (configured) search().catch(() => undefined);
              }}
              value={query}
            />

            <View style={styles.chips}>
              <CategoryChip
                label="All"
                onPress={() => setCategory(undefined)}
                selected={category == null}
              />
              <CategoryChip
                label="General"
                onPress={() => setCategory(FoodCategory.generic)}
                selected={category === FoodCategory.generic}
              />
              <CategoryChip
                label="Branded"
                onPress={() => setCategory(FoodCategory.branded)}
                selected={category === FoodCategory.branded}
              />
              <CategoryChip
                label="Recipe"
                onPress={() => setCategory(FoodCategory.recipe)}
                selected={category === FoodCategory.recipe}
              />
            </View>

            {!query.trim() ? <SearchPromptCard /> : null}

            <Pressable
              accessibilityRole="button"
              disabled={!configured || isSearching || !query.trim()}
              onPress={() => search().catch(() => undefined)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                (!configured || isSearching || !query.trim()) &&
                  styles.primaryButtonDisabled,
              ]}
              testID="search-submit"
            >
              {isSearching ? (
                <View collapsable={false} testID="search-loading">
                  <ActivityIndicator color={palette.paper} />
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    (!configured || !query.trim()) && styles.disabledButtonText,
                  ]}
                >
                  Search foods
                </Text>
              )}
            </Pressable>

            {!configured ? <ConfigurationCard /> : null}
            {error ? (
              <ErrorNotice
                message={error}
                onRetry={() => search().catch(() => undefined)}
              />
            ) : null}

            {results.length > 0 ? (
              <ResultsList items={results} />
            ) : hasSearched && !isSearching && !error ? (
              <EmptyResults />
            ) : null}
          </ScrollView>
        </View>
      ) : activeTab === 'scan' ? (
        <ScanScreen
          client={client}
          configured={configured}
          fixtures={e2eFixturesEnabled}
          onSettings={() => setShowSettings(true)}
        />
      ) : activeTab === 'foodLogs' ? (
        <FoodLogsScreen
          client={client}
          configured={configured}
          fixtures={e2eFixturesEnabled}
          onSettings={() => setShowSettings(true)}
        />
      ) : (
        <GlucoseScreen
          client={client}
          configured={configured}
          fixtures={e2eFixturesEnabled}
          onSettings={() => setShowSettings(true)}
        />
      )}

      <AppTabBar
        activeTab={activeTab}
        bottomInset={insets.bottom}
        onSelect={setActiveTab}
      />

      <SettingsSheet
        authentication={
          e2eFixturesEnabled
            ? 'UI test fixtures'
            : developmentApiKey
              ? 'Development API key'
              : 'Client token provider'
        }
        endUserId={endUserId}
        nativeVersion={nativeVersion ?? 'Unavailable'}
        onClose={() => setShowSettings(false)}
        visible={showSettings}
      />
    </View>
  );
}

function DevelopmentBanner() {
  return (
    <View style={styles.developmentBanner}>
      <MaterialCommunityIcons
        color={palette.goldText}
        name="alert-outline"
        size={18}
      />
      <Text style={styles.developmentText}>
        Local testing mode — do not distribute this build with a development API
        key.
      </Text>
    </View>
  );
}

interface SearchFieldProps {
  onChangeText: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  value: string;
}

function SearchField({
  onChangeText,
  onClear,
  onSubmit,
  value,
}: SearchFieldProps) {
  return (
    <View style={styles.searchField}>
      <MaterialCommunityIcons color={palette.muted} name="magnify" size={23} />
      <TextInput
        accessibilityLabel="Search foods"
        autoCapitalize="none"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Food name"
        placeholderTextColor={palette.subdued}
        returnKeyType="search"
        style={styles.searchInput}
        testID="search-input"
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClear}
          testID="search-clear"
        >
          <MaterialCommunityIcons
            color={palette.subdued}
            name="close-circle"
            size={21}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

interface CategoryChipProps {
  label: string;
  onPress: () => void;
  selected: boolean;
}

function CategoryChip({ label, onPress, selected }: CategoryChipProps) {
  const testId = `category-${label.toLowerCase()}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
      testID={testId}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SearchPromptCard() {
  return (
    <View style={styles.promptCard} testID="search-prompt">
      <View style={styles.promptIcon}>
        <MaterialCommunityIcons
          color={palette.green}
          name="silverware-fork-knife"
          size={23}
        />
      </View>
      <View style={styles.promptCopy}>
        <Text style={styles.cardTitle}>Find a food</Text>
        <Text style={styles.cardBody}>
          Search January’s database, then choose a serving and quantity.
        </Text>
      </View>
    </View>
  );
}

function ConfigurationCard() {
  return (
    <View style={styles.configurationCard} testID="configuration-card">
      <MaterialCommunityIcons
        color={palette.goldText}
        name="key-outline"
        size={22}
      />
      <View style={styles.promptCopy}>
        <Text style={styles.configurationTitle}>Add your API key</Text>
        <Text style={styles.configurationBody}>
          Set EXPO_PUBLIC_JANUARY_API_KEY for a local debug build.
        </Text>
      </View>
    </View>
  );
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      accessibilityRole="alert"
      style={styles.errorNotice}
      testID="search-error"
    >
      <MaterialCommunityIcons
        color={palette.rustText}
        name="alert-circle-outline"
        size={22}
      />
      <View style={styles.promptCopy}>
        <Text style={styles.errorTitle}>
          January couldn’t complete the request
        </Text>
        <Text style={styles.errorText}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.errorRetry}
          testID="search-retry"
        >
          <Text style={styles.errorRetryText}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyResults() {
  return (
    <View style={styles.promptCard} testID="empty-results">
      <View style={styles.promptIcon}>
        <MaterialCommunityIcons
          color={palette.green}
          name="magnify"
          size={24}
        />
      </View>
      <View style={styles.promptCopy}>
        <Text style={styles.cardTitle}>No foods found</Text>
        <Text style={styles.cardBody}>
          Try another name or broaden the selected food category.
        </Text>
      </View>
    </View>
  );
}

function ResultsList({ items }: { items: FoodSearchItem[] }) {
  return (
    <View style={styles.resultsSection} testID="search-results">
      <View style={styles.resultsHeading}>
        <Text style={styles.sectionLabel}>Results · January food database</Text>
        <Text style={styles.resultCount}>{items.length}</Text>
      </View>
      <View style={styles.resultsCard}>
        {items.map((item, index) => (
          <View key={item.id}>
            <FoodRow index={index} item={item} />
            {index < items.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function FoodRow({ item, index }: { item: FoodSearchItem; index: number }) {
  const serving =
    item.servings.find((candidate) => candidate.isPrimary) ?? item.servings[0];
  const servingLabel = serving
    ? `${formatNumber(serving.quantity ?? 1)} ${serving.unit ?? 'serving'}`
    : undefined;

  return (
    <View style={styles.foodRow} testID={`food-result-${index}`}>
      <View style={styles.foodImageFrame}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.foodImage} />
        ) : (
          <MaterialCommunityIcons
            color={palette.green}
            name="silverware-fork-knife"
            size={22}
          />
        )}
      </View>
      <View style={styles.foodCopy}>
        <Text numberOfLines={2} style={styles.foodName}>
          {item.name ?? 'Unnamed food'}
        </Text>
        {item.brandName ? (
          <Text numberOfLines={1} style={styles.foodBrand}>
            {item.brandName}
          </Text>
        ) : null}
        <View style={styles.foodMetaRow}>
          {item.calories != null ? (
            <Text style={styles.foodMeta}>{Math.round(item.calories)} cal</Text>
          ) : null}
          {servingLabel ? (
            <Text style={styles.foodMeta}>{servingLabel}</Text>
          ) : null}
        </View>
      </View>
      <MaterialCommunityIcons
        color={palette.subdued}
        name="chevron-right"
        size={20}
      />
    </View>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

type TabId = 'search' | 'scan' | 'foodLogs' | 'glucose';

const tabs = [
  { id: 'search', label: 'Search', icon: 'magnify' },
  { id: 'scan', label: 'Scan', icon: 'camera-outline' },
  { id: 'foodLogs', label: 'Food Logs', icon: 'format-list-bulleted' },
  { id: 'glucose', label: 'Glucose', icon: 'chart-line' },
] as const;

function AppTabBar({
  activeTab,
  bottomInset,
  onSelect,
}: {
  activeTab: TabId;
  bottomInset: number;
  onSelect: (tab: TabId) => void;
}) {
  return (
    <View
      style={[styles.tabBarArea, { paddingBottom: Math.max(bottomInset, 4) }]}
    >
      <View accessibilityRole="tablist" style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{
              selected: tab.id === activeTab,
            }}
            key={tab.label}
            onPress={() => onSelect(tab.id)}
            style={[styles.tab, tab.id === activeTab && styles.tabSelected]}
            testID={`tab-${tab.label.toLowerCase().replace(' ', '-')}`}
          >
            <MaterialCommunityIcons
              color={palette.ink}
              name={tab.icon}
              size={24}
            />
            <Text style={styles.tabLabel}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface SettingsSheetProps {
  authentication: string;
  endUserId: string;
  nativeVersion: string;
  onClose: () => void;
  visible: boolean;
}

function SettingsSheet({
  authentication,
  endUserId: userId,
  nativeVersion,
  onClose,
  visible,
}: SettingsSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close settings"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[styles.settingsSheet, { paddingBottom: insets.bottom + 24 }]}
          testID="settings-sheet"
        >
          <View style={styles.sheetHeader}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              Settings
            </Text>
            <Pressable
              accessibilityLabel="Close settings"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.sheetClose}
              testID="settings-close"
            >
              <MaterialCommunityIcons
                color={palette.ink}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          <View style={styles.connectionCard}>
            <MaterialCommunityIcons
              color={palette.green}
              name="check-circle"
              size={24}
            />
            <View style={styles.promptCopy}>
              <Text style={styles.connectionTitle}>January SDK</Text>
              <Text style={styles.connectionDetail}>{authentication}</Text>
            </View>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          <View style={styles.settingsList}>
            <SettingsRow label="End user ID" value={userId} />
            <View style={styles.divider} />
            <SettingsRow label="Timezone" value="America/New_York" />
            <View style={styles.divider} />
            <SettingsRow label="Native module" value={nativeVersion} />
            <View style={styles.divider} />
            <SettingsRow label="January API" value="Production" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.settingsValue}>
        {value}
      </Text>
    </View>
  );
}

async function fetchClientToken(
  requestedEndUserId: string
): Promise<JanuaryClientToken> {
  if (!tokenEndpoint) {
    throw new Error('EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT is not configured.');
  }
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      'x-end-user-id': requestedEndUserId,
    },
    body: JSON.stringify({ endUserId: requestedEndUserId }),
  });
  if (!response.ok) {
    throw new Error(`Token endpoint returned ${response.status}.`);
  }

  const body = (await response.json()) as {
    expiresIn?: number;
    expires_in?: number;
    token?: string;
  };
  const expiresIn = body.expiresIn ?? body.expires_in;
  if (!body.token || !expiresIn) {
    throw new Error('Token response is malformed.');
  }
  return { token: body.token, expiresIn };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.paper },
  screenBody: { flex: 1 },
  developmentBanner: {
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.goldBackground,
  },
  developmentText: {
    flex: 1,
    color: palette.goldText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  navigationRow: {
    minHeight: 94,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  screenTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 34,
    lineHeight: 41,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.controlStrong,
  },
  pressed: { opacity: 0.72 },
  content: {
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  chipSelected: { borderColor: palette.ink, backgroundColor: palette.ink },
  chipText: { color: palette.body, fontSize: 15, fontWeight: '600' },
  chipTextSelected: { color: palette.paper },
  promptCard: {
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(29, 26, 20, 0.06)',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: palette.surface,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  promptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  promptCopy: { flex: 1, gap: 4 },
  cardTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 30,
  },
  cardBody: { color: palette.body, fontSize: 15, lineHeight: 21 },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
  primaryButtonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  primaryButtonDisabled: { backgroundColor: palette.control },
  primaryButtonText: {
    color: palette.paper,
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButtonText: { color: palette.subdued },
  configurationCard: {
    padding: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.goldBackground,
  },
  configurationTitle: {
    color: palette.goldText,
    fontSize: 17,
    fontWeight: '600',
  },
  configurationBody: { color: palette.goldText, fontSize: 14, lineHeight: 20 },
  errorNotice: {
    padding: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.rustBackground,
  },
  errorTitle: { color: palette.rustText, fontSize: 17, fontWeight: '600' },
  errorText: { color: palette.rustText, fontSize: 14, lineHeight: 20 },
  errorRetry: {
    minHeight: 38,
    marginTop: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(140,74,47,0.35)',
    borderRadius: 14,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRetryText: { color: palette.rustText, fontSize: 14, fontWeight: '700' },
  resultsSection: { gap: 10 },
  resultsHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultCount: {
    color: palette.muted,
    fontFamily: Platform.select({ android: 'monospace', ios: 'Menlo' }),
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCard: {
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(29, 26, 20, 0.06)',
    borderRadius: 24,
    backgroundColor: palette.surface,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  foodRow: {
    minHeight: 90,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  foodImageFrame: {
    width: 58,
    height: 58,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  foodImage: { width: 58, height: 58 },
  foodCopy: { flex: 1, gap: 4 },
  foodName: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  foodBrand: { color: palette.muted, fontSize: 14, lineHeight: 19 },
  foodMetaRow: { flexDirection: 'row', gap: 10 },
  foodMeta: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
  tabBarArea: {
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: palette.paper,
  },
  tabBar: {
    height: 64,
    padding: 4,
    borderRadius: 38,
    flexDirection: 'row',
    backgroundColor: palette.surface,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  tab: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: { backgroundColor: palette.controlStrong },
  tabDisabled: { opacity: 0.42 },
  tabLabel: {
    color: palette.ink,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29, 26, 20, 0.3)',
  },
  settingsSheet: {
    paddingTop: 24,
    paddingHorizontal: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 20,
    backgroundColor: palette.paper,
  },
  sheetHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
  },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.controlStrong,
  },
  connectionCard: {
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
  },
  connectionTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  connectionDetail: { color: palette.muted, fontSize: 14 },
  connectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.targetBand,
  },
  connectedText: { color: palette.green, fontSize: 12, fontWeight: '700' },
  settingsList: {
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: palette.surface,
  },
  settingsRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingsLabel: { color: palette.ink, fontSize: 16, fontWeight: '600' },
  settingsValue: {
    flex: 1,
    color: palette.muted,
    fontSize: 14,
    textAlign: 'right',
  },
});
