import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FoodLog, JanuaryClient } from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
import { fixtureDelay, fixtureFoodLogs } from './e2eFixtures';
import { FoodPickerSheet, type SelectedFood } from './FoodPickerSheet';

interface FoodLogsScreenProps {
  client: JanuaryClient;
  configured: boolean;
  fixtures: boolean;
  onSettings: () => void;
}

type Range = 'week' | 'month';

export function FoodLogsScreen({
  client,
  configured,
  fixtures,
  onSettings,
}: FoodLogsScreenProps) {
  const [range, setRange] = useState<Range>('week');
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [editor, setEditor] = useState<FoodLog | 'new'>();
  const [selectedLog, setSelectedLog] = useState<FoodLog>();
  const [deleteRetryLog, setDeleteRetryLog] = useState<FoodLog>();
  const [fixtureDeleteFailed, setFixtureDeleteFailed] = useState(false);
  const handledRefreshLongPress = useRef(false);

  const load = useCallback(
    async (forceFixtureFailure = false) => {
      if (!configured) return;
      setLoading(true);
      setError(undefined);
      setDeleteRetryLog(undefined);
      try {
        if (fixtures) {
          await fixtureDelay(4000);
          if (forceFixtureFailure) {
            throw new Error('Temporary fixture food logs failure.');
          }
          setLogs(range === 'month' ? [] : fixtureFoodLogs.map(copyFoodLog));
        } else {
          const dates = dateRange(range);
          const result = await client.foodLogs.list(dates);
          setLogs(result.items);
        }
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Food logs failed to load.'
        );
      } finally {
        setLoading(false);
      }
    },
    [client, configured, fixtures, range]
  );

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function deleteLog(log: FoodLog) {
    if (!log.id) return;
    setLoading(true);
    setError(undefined);
    try {
      if (fixtures) {
        await fixtureDelay();
        if (!fixtureDeleteFailed) {
          setFixtureDeleteFailed(true);
          throw new Error('Temporary fixture deletion failure.');
        }
      } else {
        await client.foodLogs.delete(log.id);
      }
      setLogs((current) =>
        current.filter((candidate) => candidate.id !== log.id)
      );
      setSelectedLog(undefined);
      setDeleteRetryLog(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Food log deletion failed.'
      );
      setDeleteRetryLog(log);
      setSelectedLog(undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={sharedStyles.screen} testID="food-logs-screen">
      <View style={sharedStyles.header}>
        <Text accessibilityRole="header" style={sharedStyles.title}>
          Food logs
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Add food log"
            accessibilityRole="button"
            disabled={!configured}
            onPress={() => setEditor('new')}
            style={[
              sharedStyles.iconButton,
              !configured && sharedStyles.disabled,
            ]}
            testID="food-log-add"
          >
            <MaterialCommunityIcons color={palette.ink} name="plus" size={24} />
          </Pressable>
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
      </View>

      <ScrollView contentContainerStyle={sharedStyles.content}>
        <View style={sharedStyles.card}>
          <View style={styles.guideRow}>
            <View style={styles.mealIcon}>
              <MaterialCommunityIcons
                color={palette.green}
                name="food-outline"
                size={23}
              />
            </View>
            <View style={styles.flex}>
              <Text style={sharedStyles.cardTitle}>
                Build one complete meal
              </Text>
              <Text style={sharedStyles.body}>
                Each log is one eating event and can contain multiple foods.
              </Text>
            </View>
          </View>
          <Text style={styles.userMeta}>
            Logging for{' '}
            {configured ? 'react-native-demo-user' : 'an unconfigured user'}
          </Text>
        </View>

        <Text style={sharedStyles.label}>Browse saved logs</Text>
        <View style={styles.segmented}>
          <RangeButton
            label="This week"
            onPress={() => setRange('week')}
            selected={range === 'week'}
            testID="logs-range-week"
          />
          <RangeButton
            label="This month"
            onPress={() => setRange('month')}
            selected={range === 'month'}
            testID="logs-range-month"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!configured || loading}
          onPress={() => {
            if (handledRefreshLongPress.current) {
              handledRefreshLongPress.current = false;
              return;
            }
            load().catch(() => undefined);
          }}
          onLongPress={
            fixtures
              ? () => {
                  handledRefreshLongPress.current = true;
                  load(true).catch(() => undefined);
                }
              : undefined
          }
          style={[
            sharedStyles.secondaryButton,
            (!configured || loading) && sharedStyles.disabled,
          ]}
          testID="food-logs-refresh"
        >
          {loading ? (
            <View collapsable={false} testID="food-logs-loading">
              <ActivityIndicator color={palette.ink} />
            </View>
          ) : (
            <Text style={sharedStyles.secondaryText}>Refresh food logs</Text>
          )}
        </Pressable>

        {error ? (
          <View
            accessibilityRole="alert"
            style={sharedStyles.error}
            testID="food-logs-error"
          >
            <Text style={sharedStyles.errorTitle}>
              January couldn’t complete the request
            </Text>
            <Text style={sharedStyles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                (deleteRetryLog ? deleteLog(deleteRetryLog) : load()).catch(
                  () => undefined
                )
              }
              style={sharedStyles.secondaryButton}
              testID="food-logs-retry"
            >
              <Text style={sharedStyles.secondaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && logs.length === 0 ? (
          <View
            style={[sharedStyles.card, styles.empty]}
            testID="food-logs-empty"
          >
            <MaterialCommunityIcons
              color={palette.green}
              name="food-outline"
              size={30}
            />
            <Text style={sharedStyles.cardTitle}>
              No food logs in this range
            </Text>
            <Text style={[sharedStyles.body, styles.centerText]}>
              Create a log, add the foods in the meal, then save it for this
              user.
            </Text>
          </View>
        ) : null}

        <View style={styles.logList} testID="food-log-list">
          {logs.map((log, index) => (
            <Pressable
              accessibilityRole="button"
              key={log.id ?? `${log.timestampUTC}-${index}`}
              onPress={() => setSelectedLog(log)}
              style={({ pressed }) => [
                sharedStyles.card,
                styles.logRow,
                pressed && sharedStyles.pressed,
              ]}
              testID={`food-log-${index}`}
            >
              <View style={styles.mealIcon}>
                <MaterialCommunityIcons
                  color={palette.green}
                  name="food-outline"
                  size={22}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.logName}>{log.name || 'Meal'}</Text>
                <Text numberOfLines={2} style={styles.logFoods}>
                  {log.foods
                    .map((food) => food.name ?? 'Unnamed food')
                    .join(', ')}
                </Text>
                <Text style={styles.logMeta}>
                  {formatDate(log.timestampUTC)} · {log.foods.length}{' '}
                  {log.foods.length === 1 ? 'food' : 'foods'}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={palette.subdued}
                name="chevron-right"
                size={21}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <FoodLogEditor
        client={client}
        existing={editor === 'new' ? undefined : editor}
        fixtures={fixtures}
        onClose={() => setEditor(undefined)}
        onSaved={(saved) => {
          setLogs((current) => {
            const index = current.findIndex((item) => item.id === saved.id);
            if (index < 0) return [saved, ...current];
            return current.map((item) => (item.id === saved.id ? saved : item));
          });
          setSelectedLog(undefined);
          setEditor(undefined);
        }}
        visible={editor != null}
      />

      <FoodLogDetail
        loading={loading}
        log={selectedLog}
        onClose={() => setSelectedLog(undefined)}
        onDelete={(log) => {
          Alert.alert('Delete this food log?', "This action can't be undone.", [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete food log',
              style: 'destructive',
              onPress: () => deleteLog(log).catch(() => undefined),
            },
          ]);
        }}
        onEdit={(log) => setEditor(log)}
      />
    </View>
  );
}

function FoodLogEditor({
  client,
  existing,
  fixtures,
  onClose,
  onSaved,
  visible,
}: {
  client: JanuaryClient;
  existing?: FoodLog;
  fixtures: boolean;
  onClose: () => void;
  onSaved: (log: FoodLog) => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<SelectedFood[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [fixtureSaveFailed, setFixtureSaveFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(existing?.name ?? '');
    setSelected([]);
    setError(undefined);
    setFixtureSaveFailed(false);
  }, [existing, visible]);

  async function save() {
    if (!existing && selected.length === 0) return;
    setSaving(true);
    setError(undefined);
    try {
      let saved: FoodLog;
      if (fixtures) {
        await fixtureDelay();
        if (name.toLowerCase().includes('retry') && !fixtureSaveFailed) {
          setFixtureSaveFailed(true);
          throw new Error('Temporary fixture food log save failure.');
        }
        saved = existing
          ? { ...existing, name: name.trim() || 'Meal' }
          : fixtureLogFromSelection(selected, name);
      } else if (existing?.id) {
        saved = await client.foodLogs.update({
          id: existing.id,
          name: name.trim() || 'Meal',
        });
      } else {
        saved = await client.foodLogs.create({
          foods: selected.map((food) => food.selection),
          name: name.trim() || 'Meal',
          timestampUTC: new Date().toISOString(),
        });
      }
      onSaved(saved);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Food log save failed.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={sharedStyles.modalRoot}>
        <Pressable
          accessibilityLabel="Close food log editor"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[sharedStyles.sheet, { paddingBottom: insets.bottom + 20 }]}
          testID="food-log-editor"
        >
          <View style={sharedStyles.sheetHeader}>
            <Text accessibilityRole="header" style={sharedStyles.sheetTitle}>
              {existing ? 'Edit food log' : 'New food log'}
            </Text>
            <Pressable
              accessibilityLabel="Close food log editor"
              onPress={onClose}
              style={sharedStyles.iconButton}
            >
              <MaterialCommunityIcons
                color={palette.ink}
                name="close"
                size={22}
              />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={sharedStyles.label}>Meal name</Text>
            <TextInput
              accessibilityLabel="Food log name"
              onChangeText={setName}
              placeholder="Breakfast, lunch, snack…"
              placeholderTextColor={palette.subdued}
              style={sharedStyles.input}
              testID="food-log-name"
              value={name}
            />
            {!existing ? (
              <>
                <Text style={sharedStyles.label}>Foods in this meal</Text>
                {selected.map((food, index) => (
                  <View
                    key={`${food.item.id}-${index}`}
                    style={styles.selectedFood}
                  >
                    <Text style={styles.selectedFoodName}>
                      {food.item.name ?? 'Unnamed food'}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Remove ${food.item.name ?? 'food'}`}
                      onPress={() =>
                        setSelected((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      <MaterialCommunityIcons
                        color={palette.rustText}
                        name="close-circle-outline"
                        size={22}
                      />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPickerVisible(true)}
                  style={sharedStyles.secondaryButton}
                  testID="food-log-add-food"
                >
                  <MaterialCommunityIcons
                    color={palette.green}
                    name="plus"
                    size={21}
                  />
                  <Text style={sharedStyles.secondaryText}>
                    {selected.length === 0
                      ? 'Add first food'
                      : 'Add another food'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={sharedStyles.body}>
                Edit the meal name while preserving its saved foods and serving
                quantities.
              </Text>
            )}
            {error ? (
              <View
                accessibilityRole="alert"
                style={sharedStyles.error}
                testID="food-log-save-error"
              >
                <Text style={sharedStyles.errorTitle}>
                  January couldn’t complete the request
                </Text>
                <Text style={sharedStyles.errorText}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => save().catch(() => undefined)}
                  style={sharedStyles.secondaryButton}
                  testID="food-log-save-retry"
                >
                  <Text style={sharedStyles.secondaryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={saving || (!existing && selected.length === 0)}
              onPress={() => save().catch(() => undefined)}
              style={[
                sharedStyles.primaryButton,
                (saving || (!existing && selected.length === 0)) &&
                  sharedStyles.disabled,
              ]}
              testID="food-log-save"
            >
              {saving ? (
                <View collapsable={false} testID="food-log-save-loading">
                  <ActivityIndicator color={palette.paper} />
                </View>
              ) : (
                <Text style={sharedStyles.primaryText}>
                  {existing ? 'Update food log' : 'Save food log'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
          <FoodPickerSheet
            client={client}
            fixtures={fixtures}
            onClose={() => setPickerVisible(false)}
            onSelect={(food) => setSelected((current) => [...current, food])}
            visible={pickerVisible}
          />
        </View>
      </View>
    </Modal>
  );
}

function FoodLogDetail({
  loading,
  log,
  onClose,
  onDelete,
  onEdit,
}: {
  loading: boolean;
  log?: FoodLog;
  onClose: () => void;
  onDelete: (log: FoodLog) => void;
  onEdit: (log: FoodLog) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      visible={log != null}
    >
      {log ? (
        <View
          style={[sharedStyles.screen, { paddingTop: insets.top }]}
          testID="food-log-detail"
        >
          <View style={styles.detailHeader}>
            <Pressable
              accessibilityLabel="Back from food log"
              onPress={onClose}
              style={sharedStyles.iconButton}
            >
              <MaterialCommunityIcons
                color={palette.ink}
                name="arrow-left"
                size={22}
              />
            </Pressable>
            <Text style={styles.detailHeaderTitle}>Food log</Text>
            <Pressable
              accessibilityLabel="Edit food log"
              onPress={() => onEdit(log)}
              style={sharedStyles.iconButton}
              testID="food-log-edit"
            >
              <MaterialCommunityIcons
                color={palette.ink}
                name="pencil-outline"
                size={21}
              />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={sharedStyles.content}>
            <Text style={styles.detailTitle}>{log.name || 'Meal'}</Text>
            <Text style={styles.logMeta}>{formatDate(log.timestampUTC)}</Text>
            {log.foods.map((food, index) => (
              <View key={`${food.id ?? index}`} style={sharedStyles.card}>
                <Text style={styles.logName}>
                  {food.name ?? 'Unnamed food'}
                </Text>
                <Text style={sharedStyles.body}>
                  {food.consumedServing.quantity ?? 1} ×{' '}
                  {food.servingDetails.quantity ?? 1}{' '}
                  {food.servingDetails.unit ?? 'serving'}
                </Text>
                <View style={styles.detailMacros}>
                  <Nutrient
                    label="Calories"
                    value={food.nutrients.calories?.value}
                  />
                  <Nutrient
                    label="Protein"
                    value={food.nutrients.protein?.value}
                    unit="g"
                  />
                  <Nutrient
                    label="Carbs"
                    value={food.nutrients.carbohydrates?.value}
                    unit="g"
                  />
                  <Nutrient
                    label="Fat"
                    value={food.nutrients.totalFat?.value}
                    unit="g"
                  />
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => onDelete(log)}
              style={styles.deleteButton}
              testID="food-log-delete"
            >
              <MaterialCommunityIcons
                color={palette.rustText}
                name="delete-outline"
                size={21}
              />
              <Text style={styles.deleteText}>Delete food log</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

function RangeButton({
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
      style={[styles.rangeButton, selected && styles.rangeSelected]}
      testID={testID}
    >
      <Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Nutrient({
  label,
  value,
  unit = 'cal',
}: {
  label: string;
  value?: number;
  unit?: string;
}) {
  return (
    <View style={styles.nutrient}>
      <Text style={styles.nutrientValue}>
        {value == null ? '—' : Math.round(value)}
      </Text>
      <Text style={styles.nutrientLabel}>
        {unit} · {label}
      </Text>
    </View>
  );
}

function dateRange(range: Range): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  if (range === 'week') start.setDate(end.getDate() - 6);
  else start.setDate(1);
  return { start: isoDate(start), end: isoDate(end) };
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

function copyFoodLog(log: FoodLog): FoodLog {
  return { ...log, foods: log.foods.map((food) => ({ ...food })) };
}

function fixtureLogFromSelection(
  selected: SelectedFood[],
  name: string
): FoodLog {
  return {
    id: `fixture-log-${Date.now()}`,
    name: name.trim() || 'Meal',
    timestampUTC: new Date().toISOString(),
    foods: selected.map(({ item, selection }) => {
      const serving = item.servings.find(
        (candidate) => candidate.id === selection.serving.id
      );
      return {
        id: item.id,
        name: item.name,
        brandName: item.brandName,
        imageURL: item.photoURL,
        nutrients: item.nutrients ?? {
          calories:
            item.calories == null
              ? undefined
              : { value: item.calories, unit: 'cal' },
          protein:
            item.protein == null
              ? undefined
              : { value: item.protein, unit: 'g' },
          carbohydrates:
            item.carbohydrates == null
              ? undefined
              : { value: item.carbohydrates, unit: 'g' },
          totalFat:
            item.totalFat == null
              ? undefined
              : { value: item.totalFat, unit: 'g' },
        },
        consumedServing: {
          id: selection.serving.id,
          quantity: selection.serving.quantity,
        },
        servingDetails: {
          id: serving?.id,
          quantity: serving?.quantity,
          unit: serving?.unit,
          weightGrams: serving?.weightGrams,
        },
      };
    }),
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  userMeta: { color: palette.green, fontSize: 13, fontWeight: '700' },
  segmented: {
    padding: 4,
    borderRadius: 18,
    flexDirection: 'row',
    backgroundColor: palette.controlStrong,
  },
  rangeButton: {
    minHeight: 42,
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeSelected: { backgroundColor: palette.surface },
  rangeText: { color: palette.muted, fontSize: 14, fontWeight: '700' },
  rangeTextSelected: { color: palette.ink },
  empty: { alignItems: 'center', paddingVertical: 30 },
  centerText: { textAlign: 'center' },
  logList: { gap: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  logName: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  logFoods: { color: palette.body, fontSize: 14, lineHeight: 19 },
  logMeta: { color: palette.muted, fontSize: 12, marginTop: 4 },
  editorContent: { gap: 14, paddingBottom: 8 },
  selectedFood: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
  },
  selectedFoodName: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  detailHeader: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeaderTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  detailTitle: { color: palette.ink, fontSize: 31, fontWeight: '700' },
  detailMacros: { paddingTop: 8, flexDirection: 'row' },
  nutrient: { flex: 1, alignItems: 'center' },
  nutrientValue: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  nutrientLabel: { color: palette.muted, fontSize: 10 },
  deleteButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(140,74,47,0.3)',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.rustBackground,
  },
  deleteText: { color: palette.rustText, fontSize: 15, fontWeight: '700' },
});
