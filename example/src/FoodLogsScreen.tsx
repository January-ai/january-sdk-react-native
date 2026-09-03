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

type Range = 'today' | 'week' | 'month';

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
          await fixtureDelay(8000);
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
      <View style={styles.logsHeader}>
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
              name="cog-outline"
              size={25}
            />
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.logsTitle}>
          Food logs
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.logsContent}>
        <View style={styles.workflowCard}>
          <View style={styles.guideRow}>
            <View style={styles.mealIcon}>
              <MaterialCommunityIcons
                color={palette.green}
                name="clipboard-text-outline"
                size={23}
              />
            </View>
            <View style={styles.flex}>
              <Text style={sharedStyles.cardTitle}>
                Build one complete meal
              </Text>
              <Text style={sharedStyles.body}>
                One food log represents one meal or eating event. It can contain
                multiple foods, each with its own serving and quantity.
              </Text>
            </View>
          </View>
          <WorkflowStep number="1" text="Identify the user who owns the log" />
          <WorkflowStep
            number="2"
            text="Create a log and add every food in the meal"
          />
          <WorkflowStep
            number="3"
            text="Save it, then browse that user’s history"
          />
        </View>

        <Text style={sharedStyles.label}>User identity</Text>
        <View style={styles.userCard} testID="food-log-user-card">
          <View style={styles.userHeading}>
            <MaterialCommunityIcons
              color={palette.goldText}
              name="account-circle"
              size={24}
            />
            <View style={styles.flex}>
              <Text style={styles.userTitle}>Logging for this user</Text>
              <Text style={styles.userBody}>
                New logs and saved-log searches use this identity.
              </Text>
            </View>
          </View>
          <View style={styles.userIdentity}>
            <Text style={styles.userId}>parity-user</Text>
            <Text style={styles.userTimezone}>America/New_York</Text>
          </View>
          <Pressable onPress={onSettings}>
            <Text style={styles.userAction}>Change user or timezone</Text>
          </Pressable>
        </View>

        <Pressable
          disabled={!configured}
          onPress={() => setEditor('new')}
          style={[
            sharedStyles.primaryButton,
            !configured && sharedStyles.disabled,
          ]}
          testID="food-log-create"
        >
          <MaterialCommunityIcons color={palette.paper} name="plus" size={22} />
          <Text style={sharedStyles.primaryText}>Create a food log</Text>
        </Pressable>

        <Text style={sharedStyles.label}>Browse saved logs</Text>
        <Text style={styles.browseCopy}>
          Food logs are fetched for the selected user ID and date range.
        </Text>
        <View style={styles.rangeCard}>
          <View style={styles.segmented}>
            <RangeButton
              label="Today"
              onPress={() => setRange('today')}
              selected={range === 'today'}
              testID="logs-range-today"
            />
            <RangeButton
              label="This week"
              onPress={() => setRange('week')}
              selected={range === 'week'}
              testID="logs-range-week"
            />
            <RangeButton
              label="Last month"
              onPress={() => setRange('month')}
              selected={range === 'month'}
              testID="logs-range-month"
            />
          </View>
          <View style={styles.datesRow}>
            <Text style={styles.datesLabel}>Dates</Text>
            <Text style={styles.datesValue}>{formatRange(range)}</Text>
          </View>
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
            sharedStyles.primaryButton,
            (!configured || loading) && sharedStyles.disabled,
          ]}
          testID="food-logs-refresh"
        >
          {loading ? (
            <View collapsable={false} testID="food-logs-loading">
              <ActivityIndicator color={palette.paper} />
            </View>
          ) : (
            <Text style={sharedStyles.primaryText}>Refresh food logs</Text>
          )}
        </Pressable>

        {loading && logs.length === 0 ? (
          <View style={styles.loadingLogs}>
            <ActivityIndicator color={palette.green} size="small" />
            <Text style={styles.loadingLogsText}>Loading food logs…</Text>
          </View>
        ) : null}

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
              Create a log, add one or more foods to the meal, then save it for
              this user.
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
      <View style={styles.editorModalRoot}>
        <View
          style={[
            styles.editorSheet,
            {
              paddingTop: insets.top + 42,
              paddingBottom: insets.bottom,
            },
          ]}
          testID="food-log-editor"
        >
          <View style={[styles.editorHandle, { top: insets.top + 16 }]} />
          <View style={styles.editorHeader}>
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
            <Text accessibilityRole="header" style={styles.editorHeaderTitle}>
              {existing ? 'Edit food log' : 'New food log'}
            </Text>
            <View style={styles.editorHeaderSpacer} />
          </View>
          <ScrollView
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
          >
            <EditorGuide editing={Boolean(existing)} />
            <Text style={sharedStyles.label}>Meal details</Text>
            <View style={styles.editorFieldGroup}>
              <Text style={styles.editorFieldLabel}>Meal name</Text>
              <TextInput
                accessibilityLabel="Food log name"
                onChangeText={setName}
                placeholder="Optional name"
                placeholderTextColor={palette.subdued}
                style={styles.editorNameInput}
                testID="food-log-name"
                value={name}
              />
            </View>
            <View style={styles.dateTimeCard}>
              <Text style={styles.editorFieldLabel}>Date and time</Text>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>Aug 31, 2026</Text>
              </View>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>
                  {existing ? '8:00 AM' : '3:40 PM'}
                </Text>
              </View>
            </View>
            <Text style={sharedStyles.label}>
              Foods in this meal ·{' '}
              {existing ? existing.foods.length : selected.length}
            </Text>
            {!existing && selected.length === 0 ? (
              <View style={styles.editorEmpty} testID="food-log-editor-empty">
                <MaterialCommunityIcons
                  color={palette.green}
                  name="plus-circle-outline"
                  size={25}
                />
                <Text style={styles.editorEmptyTitle}>No foods added</Text>
                <Text style={styles.editorEmptyBody}>
                  Start with one food, then keep adding until the complete meal
                  is represented.
                </Text>
              </View>
            ) : null}
            {existing
              ? existing.foods.map((food, index) => (
                  <EditorLoggedFood food={food} key={`${food.id ?? index}`} />
                ))
              : selected.map((food, index) => (
                  <EditorSelectedFood
                    food={food}
                    key={`${food.item.id}-${index}`}
                    onRemove={() =>
                      setSelected((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  />
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
                {(existing?.foods.length ?? selected.length) === 0
                  ? 'Add first food'
                  : 'Add another food'}
              </Text>
            </Pressable>
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
            <View style={styles.editorBottomSpace} />
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

function EditorGuide({ editing }: { editing: boolean }) {
  return (
    <View style={styles.editorGuide}>
      <View style={styles.guideRow}>
        <View style={styles.editorGuideIcon}>
          <MaterialCommunityIcons
            color={palette.green}
            name="silverware-fork-knife"
            size={22}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.editorGuideTitle}>
            {editing ? 'Update this meal' : 'Build this meal'}
          </Text>
          <Text style={styles.editorGuideBody}>
            A log is one meal. Add every food that belongs to it, then choose
            each serving and quantity before saving.
          </Text>
        </View>
      </View>
      <WorkflowStep number="1" text="Set the meal time" />
      <WorkflowStep number="2" text="Add one or more foods" />
      <WorkflowStep number="3" text="Review servings and save" />
    </View>
  );
}

function EditorSelectedFood({
  food,
  onRemove,
}: {
  food: SelectedFood;
  onRemove: () => void;
}) {
  const serving = food.item.servings.find(
    (candidate) => candidate.id === food.selection.serving.id
  );
  return (
    <View style={styles.editorFoodCard}>
      <View style={styles.editorFoodHeading}>
        <View style={styles.smallMealIcon}>
          <MaterialCommunityIcons
            color={palette.paper}
            name="silverware-fork-knife"
            size={16}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.editorFoodName}>
            {food.item.name ?? 'Unnamed food'}
          </Text>
          {food.item.brandName ? (
            <Text style={styles.editorFoodBrand}>{food.item.brandName}</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={`Remove ${food.item.name ?? 'food'}`}
          onPress={onRemove}
        >
          <MaterialCommunityIcons
            color={palette.rustText}
            name="delete-outline"
            size={21}
          />
        </Pressable>
      </View>
      <View style={sharedStyles.divider} />
      <View style={styles.editorFoodRow}>
        <Text style={styles.editorFieldLabel}>Serving</Text>
        <Text style={styles.editorFoodValue}>
          {serving?.quantity ?? 1} {serving?.unit ?? 'serving'}　⌃
        </Text>
      </View>
      <View style={sharedStyles.divider} />
      <View style={styles.editorFoodRow}>
        <View>
          <Text style={styles.editorFieldLabel}>Quantity</Text>
          <Text style={styles.editorFoodBrand}>
            {food.selection.serving.quantity}
          </Text>
        </View>
        <View style={styles.editorStepper}>
          <Text style={styles.editorStepText}>−　＋</Text>
        </View>
      </View>
    </View>
  );
}

function EditorLoggedFood({ food }: { food: FoodLog['foods'][number] }) {
  return (
    <View style={styles.editorFoodCard}>
      <View style={styles.editorFoodHeading}>
        <View style={styles.smallMealIcon}>
          <MaterialCommunityIcons
            color={palette.paper}
            name="silverware-fork-knife"
            size={16}
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.editorFoodName}>
            {food.name ?? 'Unnamed food'}
          </Text>
          {food.brandName ? (
            <Text style={styles.editorFoodBrand}>{food.brandName}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons
          color={palette.rustText}
          name="delete-outline"
          size={21}
        />
      </View>
      <View style={sharedStyles.divider} />
      <View style={styles.editorFoodRow}>
        <Text style={styles.editorFieldLabel}>Serving</Text>
        <Text style={styles.editorFoodValue}>
          {food.servingDetails.quantity ?? 1}{' '}
          {food.servingDetails.unit ?? 'serving'}　⌃
        </Text>
      </View>
      <View style={sharedStyles.divider} />
      <View style={styles.editorFoodRow}>
        <View>
          <Text style={styles.editorFieldLabel}>Quantity</Text>
          <Text style={styles.editorFoodBrand}>
            {food.consumedServing.quantity ?? 1}
          </Text>
        </View>
        <View style={styles.editorStepper}>
          <Text style={styles.editorStepText}>−　＋</Text>
        </View>
      </View>
    </View>
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
              testID="food-log-edit"
            >
              <Text style={styles.editText}>Edit</Text>
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
                {food.brandName ? (
                  <Text style={styles.detailBrand}>{food.brandName}</Text>
                ) : null}
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
                {food.nutrients.fiber?.value != null ? (
                  <View style={styles.detailNutritionRow}>
                    <Text style={styles.detailNutritionText}>Fiber</Text>
                    <Text style={styles.detailNutritionText}>
                      {food.nutrients.fiber.value} g
                    </Text>
                  </View>
                ) : null}
                {food.nutrients.sodium?.value != null ? (
                  <View style={styles.detailNutritionRow}>
                    <Text style={styles.detailNutritionText}>Sodium</Text>
                    <Text style={styles.detailNutritionText}>
                      {food.nutrients.sodium.value} mg
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
            <View style={styles.technicalRow}>
              <Text style={styles.technicalText}>Technical details</Text>
              <MaterialCommunityIcons
                color={palette.ink}
                name="chevron-right"
                size={20}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => onDelete(log)}
              style={styles.deleteButton}
              testID="food-log-delete"
            >
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

function WorkflowStep({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.workflowStep}>
      <View style={styles.workflowNumber}>
        <Text style={styles.workflowNumberText}>{number}</Text>
      </View>
      <Text style={styles.workflowText}>{text}</Text>
    </View>
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
      <Text style={styles.nutrientLabel}>{label}</Text>
      <Text style={styles.nutrientValue}>
        {value == null ? '—' : Math.round(value)}{' '}
        <Text style={styles.nutrientUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function dateRange(range: Range): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  let end = new Date(now);
  if (range === 'week') {
    start.setDate(now.getDate() - now.getDay());
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (range === 'month') {
    start.setMonth(now.getMonth() - 1, 1);
    end.setDate(0);
  }
  return { start: isoDate(start), end: isoDate(end) };
}

function formatRange(range: Range): string {
  const dates = dateRange(range);
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  return `${format(dates.start)} – ${format(dates.end)}`;
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
  logsHeader: { height: 112 },
  headerActions: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  logsTitle: {
    paddingHorizontal: 16,
    color: palette.ink,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  logsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  workflowCard: {
    minHeight: 263,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    gap: 13,
    backgroundColor: palette.surface,
  },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  workflowStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workflowNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  workflowNumberText: { color: palette.green, fontSize: 12, fontWeight: '800' },
  workflowText: {
    flex: 1,
    color: palette.body,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  userCard: {
    minHeight: 210,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(110,86,19,0.28)',
    borderRadius: 28,
    gap: 16,
    backgroundColor: palette.goldBackground,
  },
  userHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  userTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  userBody: { marginTop: 4, color: palette.body, fontSize: 15, lineHeight: 20 },
  userIdentity: { gap: 5 },
  userId: {
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '600',
  },
  userTimezone: { color: palette.muted, fontSize: 12 },
  userAction: { color: palette.goldText, fontSize: 15, fontWeight: '700' },
  browseCopy: { color: palette.body, fontSize: 15, lineHeight: 20 },
  rangeCard: {
    padding: 20,
    borderRadius: 24,
    gap: 14,
    backgroundColor: palette.surface,
  },
  segmented: {
    minHeight: 36,
    padding: 2,
    borderRadius: 18,
    flexDirection: 'row',
    backgroundColor: palette.controlStrong,
  },
  rangeButton: {
    minHeight: 32,
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeSelected: { backgroundColor: palette.surface },
  rangeText: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  rangeTextSelected: { color: palette.ink },
  datesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  datesLabel: { color: palette.ink, fontSize: 16, fontWeight: '600' },
  datesValue: {
    flex: 1,
    color: palette.muted,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'right',
  },
  loadingLogs: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingLogsText: { color: palette.muted, fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 30 },
  centerText: { textAlign: 'center' },
  logList: { gap: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  logName: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  logFoods: { color: palette.body, fontSize: 14, lineHeight: 19 },
  logMeta: { color: palette.muted, fontSize: 12, marginTop: 4 },
  editorModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29,26,20,0.46)',
  },
  editorSheet: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.paper,
  },
  editorHandle: {
    position: 'absolute',
    left: '50%',
    width: 32,
    height: 5,
    marginLeft: -16,
    borderRadius: 3,
    backgroundColor: palette.body,
  },
  editorHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorHeaderTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  editorHeaderSpacer: { width: 44 },
  editorContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 8,
    gap: 20,
  },
  editorGuide: {
    minHeight: 260,
    padding: 20,
    borderRadius: 24,
    gap: 13,
    backgroundColor: palette.surface,
  },
  editorGuideIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  editorGuideTitle: {
    color: palette.ink,
    fontFamily: 'serif',
    fontSize: 23,
    lineHeight: 28,
  },
  editorGuideBody: {
    marginTop: 4,
    color: palette.body,
    fontSize: 14,
    lineHeight: 20,
  },
  editorFieldGroup: { gap: 8 },
  editorFieldLabel: { color: palette.ink, fontSize: 16, fontWeight: '600' },
  editorNameInput: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 18,
    color: palette.ink,
    backgroundColor: palette.control,
    fontSize: 16,
  },
  dateTimeCard: {
    minHeight: 86,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.surface,
  },
  datePill: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  datePillText: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  editorEmpty: {
    minHeight: 174,
    padding: 20,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.surface,
  },
  editorEmptyTitle: {
    color: palette.ink,
    fontFamily: 'serif',
    fontSize: 24,
    lineHeight: 30,
  },
  editorEmptyBody: {
    color: palette.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  editorFoodCard: {
    padding: 20,
    borderRadius: 24,
    gap: 14,
    backgroundColor: palette.surface,
  },
  editorFoodHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  smallMealIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.green,
  },
  editorFoodName: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  editorFoodBrand: { marginTop: 3, color: palette.muted, fontSize: 14 },
  editorFoodRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorFoodValue: { color: palette.green, fontSize: 14, fontWeight: '600' },
  editorStepper: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.control,
  },
  editorStepText: { color: palette.ink, fontSize: 20 },
  editorBottomSpace: { height: 88 },
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
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeaderTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  editText: { color: palette.goldText, fontSize: 15, fontWeight: '600' },
  detailTitle: {
    color: palette.ink,
    fontFamily: 'serif',
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  detailBrand: { color: palette.muted, fontSize: 14 },
  detailMacros: { paddingTop: 8, flexDirection: 'row', flexWrap: 'wrap' },
  nutrient: { width: '50%', minHeight: 62, gap: 4 },
  nutrientValue: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  nutrientUnit: { color: palette.body, fontSize: 12, fontWeight: '400' },
  nutrientLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailNutritionRow: {
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailNutritionText: { color: palette.body, fontSize: 15 },
  technicalRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  technicalText: { color: palette.body, fontSize: 13 },
  deleteButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(140,74,47,0.3)',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: palette.rustBackground,
  },
  deleteText: { color: palette.rustText, fontSize: 15, fontWeight: '700' },
});
