import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import type { FoodLog, JanuaryClient } from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
import {
  EmptyStateCard,
  MacroGrid,
  NutritionList,
  SectionLabel,
  WorkflowGuideCard,
} from './designSystem';
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

      <ScrollView
        contentContainerStyle={styles.logsContent}
        style={sharedStyles.scroll}
      >
        <WorkflowGuideCard
          icon="clipboard-text-outline"
          message="One food log represents one meal or eating event. It can contain multiple foods, each with its own serving and quantity."
          steps={[
            'Identify the user who owns the log',
            'Create a log and add every food in the meal',
            'Save it, then browse that user’s history',
          ]}
          title="Build one complete meal"
        />

        <SectionLabel>User identity</SectionLabel>
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
          <Pressable onPress={onSettings} style={styles.userActionButton}>
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

        <SectionLabel>Browse saved logs</SectionLabel>
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
          testID={loading ? 'food-logs-loading' : 'food-logs-refresh'}
        >
          {loading ? (
            <View collapsable={false}>
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
          <EmptyStateCard
            icon="food-outline"
            message="Create a log, add one or more foods to the meal, then save it for this user."
            testID="food-logs-empty"
            title="No food logs in this range"
          />
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
              paddingTop: insets.top + 47,
              paddingBottom: insets.bottom,
            },
          ]}
          testID="food-log-editor"
        >
          <View style={[styles.editorHandle, { top: insets.top + 21 }]} />
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
            <SectionLabel>Meal details</SectionLabel>
            <View style={styles.editorFieldGroup}>
              <Text style={styles.editorFieldLabel}>Meal name</Text>
              <TextInput
                accessibilityLabel="Food log name"
                onChangeText={setName}
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Optional name"
                placeholderTextColor={palette.subdued}
                returnKeyType="done"
                style={styles.editorNameInput}
                submitBehavior="blurAndSubmit"
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
            <SectionLabel>
              {`Foods in this meal · ${existing ? existing.foods.length : selected.length}`}
            </SectionLabel>
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
              testID={saving ? 'food-log-save-loading' : 'food-log-save'}
            >
              {saving ? (
                <View collapsable={false}>
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
    <WorkflowGuideCard
      icon="silverware-fork-knife"
      message="A log is one meal. Add every food that belongs to it, then choose each serving and quantity before saving."
      steps={[
        'Set the meal time',
        'Add one or more foods',
        'Review servings and save',
      ]}
      title={editing ? 'Update this meal' : 'Build this meal'}
    />
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
  if (!log) return null;
  return (
    <View
      style={[sharedStyles.screen, styles.detailScreen]}
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
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        style={sharedStyles.scroll}
      >
        <Text style={styles.detailTitle}>{log.name || 'Meal'}</Text>
        <Text style={styles.logMeta}>{formatDate(log.timestampUTC)}</Text>
        {log.foods.map((food, index) => (
          <View
            key={`${food.id ?? index}`}
            style={[sharedStyles.card, styles.loggedFoodCard]}
          >
            <Text style={styles.logName}>{food.name ?? 'Unnamed food'}</Text>
            {food.brandName ? (
              <Text style={styles.detailBrand}>{food.brandName}</Text>
            ) : null}
            <Text style={sharedStyles.body}>
              {food.consumedServing.quantity ?? 1} ×{' '}
              {food.servingDetails.quantity ?? 1}{' '}
              {food.servingDetails.unit ?? 'serving'}
            </Text>
            <MacroGrid
              values={[
                {
                  label: 'Calories',
                  value: food.nutrients.calories?.value,
                  unit: food.nutrients.calories?.unit ?? 'cal',
                },
                {
                  label: 'Protein',
                  value: food.nutrients.protein?.value,
                  unit: food.nutrients.protein?.unit ?? 'g',
                },
                {
                  label: 'Carbs',
                  value: food.nutrients.carbohydrates?.value,
                  unit: food.nutrients.carbohydrates?.unit ?? 'g',
                },
                {
                  label: 'Fat',
                  value: food.nutrients.totalFat?.value,
                  unit: food.nutrients.totalFat?.unit ?? 'g',
                },
              ]}
            />
            <NutritionList
              rows={supplementalNutrition(food.nutrients)
                .filter((entry) => entry[1] != null)
                .map(([label, amount]) => ({
                  label,
                  value: `${amount!.value} ${amount!.unit}`,
                }))}
            />
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
        timeStyle: 'medium',
      });
}

function supplementalNutrition(
  nutrients: FoodLog['foods'][number]['nutrients']
) {
  return [
    ['Net carbohydrates', nutrients.netCarbohydrates],
    ['Trans fat', nutrients.transFat],
    ['Saturated fat', nutrients.saturatedFat],
    ['Fiber', nutrients.fiber],
    ['Total sugars', nutrients.totalSugars],
    ['Added sugars', nutrients.addedSugars],
    ['Cholesterol', nutrients.cholesterol],
    ['Calcium', nutrients.calcium],
    ['Iron', nutrients.iron],
    ['Potassium', nutrients.potassium],
    ['Sodium', nutrients.sodium],
    ['Vitamin D', nutrients.vitaminD],
  ] as const;
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
  mealIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
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
  userActionButton: { minHeight: 48, justifyContent: 'center' },
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
  detailScreen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: palette.paper,
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
  loggedFoodCard: { marginTop: 4, gap: 10 },
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
