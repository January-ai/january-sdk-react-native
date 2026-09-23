import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  DailyWaterTotal,
  DailyWeight,
  FoodLog,
  FoodLogSummary,
  JanuaryClient,
  VolumeUnit,
  WeightUnit,
} from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
import { goBack, navigateTo, ScreenStack, useScreenStack } from './navigation';
import {
  EmptyStateCard,
  MacroGrid,
  SectionLabel,
  SegmentedControl,
  WorkflowGuideCard,
} from './designSystem';
import {
  createFixtureWaterLog,
  createFixtureWeightLog,
  deleteFixtureWaterLog,
  failFixtureRequestsOnce,
  failIfArmed,
  fixtureDelay,
  fixtureFoodLogsForUser,
  listFixtureWaterLogs,
  listFixtureWeightLogs,
} from './e2eFixtures';
import { localIsoDate, shiftIsoDate, timestampForDay } from './localDate';
import { WaterChart, WeightChart } from './TrackingCharts';
import { convertWaterDraft, convertWeightDraft } from './unitDrafts';
import {
  copyFoodLog,
  FoodLogDetail,
  fixtureSummaryFor,
  formatDate,
} from './FoodLogsScreen';

// The iOS decimal pad has no return key, so it could never be dismissed; the
// numbers-and-punctuation keyboard has one and still opens on digits.
const numericKeyboard =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad';

interface TrackingScreenProps {
  client: JanuaryClient;
  configured: boolean;
  fixtures: boolean;
  onSettings: () => void;
}

/**
 * The Tracking tab is one day at a time: the day's food-log totals from the
 * summary endpoint, the meals logged that day, the day's water total, and the
 * day's weight. Every request uses the day as both start and end, so the API
 * answers with exactly one summary bucket, one water total, and one weight.
 * Meals are created and edited on the Logs tab; here a meal opens read-only.
 * Days are the device's calendar dates, the calendar the client's timezone
 * (the device's) reads request dates in.
 */
export function TrackingScreen({
  client,
  configured,
  fixtures,
  onSettings,
}: TrackingScreenProps) {
  const [day, setDay] = useState(() => localIsoDate());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [summary, setSummary] = useState<FoodLogSummary>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedLog, setSelectedLog] = useState<FoodLog>();
  const stack = useScreenStack();
  // A load owns the screen only while its ticket is current; a day change or a
  // newer refresh that lands first wins.
  const loadTicket = useRef(0);

  const load = useCallback(async () => {
    if (!configured) return;
    const ticket = ++loadTicket.current;
    setLoading(true);
    setError(undefined);
    try {
      if (fixtures) {
        await failIfArmed(`meals:${day}`);
        await fixtureDelay(800);
        if (ticket !== loadTicket.current) return;
        setLogs(
          day === localIsoDate()
            ? fixtureFoodLogsForUser().map(copyFoodLog)
            : []
        );
        setSummary(undefined);
      } else {
        const range = { start: day, end: day };
        const [listed, summarized] = await Promise.all([
          client.foodLogs.list(range),
          client.foodLogs.getSummary({ ...range, groupBy: 'day' }),
        ]);
        if (ticket !== loadTicket.current) return;
        setLogs(listed.items);
        setSummary(summarized);
      }
    } catch (caught) {
      if (ticket !== loadTicket.current) return;
      setError(
        caught instanceof Error ? caught.message : 'Food logs failed to load.'
      );
    } finally {
      if (ticket === loadTicket.current) setLoading(false);
    }
  }, [client, configured, day, fixtures]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  // Fixture mode has no server to total the day, so the summary is computed
  // from the fixture meals the way the API would.
  const shownSummary = useMemo(
    () =>
      fixtures ? fixtureSummaryFor(logs, { start: day, end: day }) : summary,
    [day, fixtures, logs, summary]
  );

  const changeDay = (next: string) => {
    if (next === day || next > localIsoDate()) return;
    loadTicket.current += 1;
    setLogs([]);
    setSummary(undefined);
    setDay(next);
  };

  // Fixture mode only: a long press on Previous day opens that day with its
  // meals, water, and weight requests failing once, so a flow can reach the
  // loading, error, and retry states of each.
  const previousDayWithFailures = fixtures
    ? () => {
        const previous = shiftIsoDate(day, -1);
        failFixtureRequestsOnce(
          `meals:${previous}`,
          `water:${previous}`,
          `weight:${previous}`
        );
        changeDay(previous);
      }
    : undefined;

  const root = (
    <View style={sharedStyles.screen} testID="tracking-screen">
      <View style={styles.logsHeader}>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
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
        <Text accessibilityRole="header" style={styles.logsTitle}>
          Tracking
        </Text>
      </View>

      {/* The day picker stays under the title so every section below can be
          read against the day it belongs to. */}
      <View style={styles.dayBar}>
        <DayNavigator
          day={day}
          onChange={changeDay}
          onPreviousLongPress={previousDayWithFailures}
        />
        {/* The day itself failed to load: say so under the picker, where it
            stays in view (and its retry in reach) wherever the day's cards
            are scrolled to. */}
        {error ? (
          <View
            accessibilityRole="alert"
            style={sharedStyles.error}
            testID="tracking-logs-error"
          >
            <Text style={sharedStyles.errorTitle}>
              January couldn’t complete the request
            </Text>
            <Text style={sharedStyles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => load().catch(() => undefined)}
              style={sharedStyles.secondaryButton}
              testID="tracking-logs-retry"
            >
              <Text style={sharedStyles.secondaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.logsContent}
        keyboardShouldPersistTaps="handled"
        style={sharedStyles.scroll}
      >
        <WorkflowGuideCard
          icon="chart-box-outline"
          message="One day of a user's tracking: the food-log summary, the meals behind it, water, and weight. Move between days to browse their history."
          steps={[
            'Pick a day',
            'Read the day’s totals the way the summary endpoint reports them',
            'Log water or a weight for that day',
          ]}
          title="Track one day at a time"
        />

        <SectionLabel>Food</SectionLabel>
        {shownSummary && shownSummary.totals.logsCount > 0 ? (
          <View style={styles.rangeCard} testID="tracking-totals">
            <View style={styles.datesRow}>
              <Text style={styles.datesLabel}>Day total</Text>
              <Text style={styles.datesValue}>
                {formatSummary(shownSummary)}
              </Text>
            </View>
            <MacroGrid
              values={[
                {
                  label: 'Calories',
                  unit: 'kcal',
                  value: shownSummary.totals.nutrients.calories?.value,
                },
                {
                  label: 'Protein',
                  unit: 'g',
                  value: shownSummary.totals.nutrients.protein?.value,
                },
                {
                  label: 'Carbs',
                  unit: 'g',
                  value: shownSummary.totals.nutrients.carbohydrates?.value,
                },
                {
                  label: 'Fat',
                  unit: 'g',
                  value: shownSummary.totals.nutrients.totalFat?.value,
                },
              ]}
            />
          </View>
        ) : null}

        {loading && logs.length === 0 ? (
          <View style={styles.loadingLogs} testID="tracking-loading">
            <ActivityIndicator color={palette.green} size="small" />
            <Text style={styles.loadingLogsText}>Loading the day…</Text>
          </View>
        ) : null}

        {!loading && !error && logs.length === 0 ? (
          <EmptyStateCard
            icon="food-outline"
            message="Meals logged on the Logs tab for this day appear here with their totals."
            testID="tracking-logs-empty"
            title="No food logs on this day"
          />
        ) : null}

        <View style={styles.logList} testID="tracking-log-list">
          {logs.map((log, index) => (
            <Pressable
              accessibilityRole="button"
              key={log.id ?? `${log.timestampUTC}-${index}`}
              onPress={() => {
                setSelectedLog(log);
                navigateTo(stack, 'Detail');
              }}
              style={({ pressed }) => [
                sharedStyles.card,
                styles.logRow,
                pressed && sharedStyles.pressed,
              ]}
              testID={`tracking-log-${index}`}
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

        <SectionLabel>Water</SectionLabel>
        <WaterCard
          client={client}
          configured={configured}
          day={day}
          fixtures={fixtures}
        />

        <SectionLabel>Weight</SectionLabel>
        <WeightCard
          client={client}
          configured={configured}
          day={day}
          fixtures={fixtures}
        />
      </ScrollView>
    </View>
  );

  return (
    <View style={sharedStyles.screen}>
      <ScreenStack
        root={root}
        screens={{
          Detail: selectedLog ? (
            <FoodLogDetail
              loading={false}
              log={selectedLog}
              onClose={() => goBack(stack)}
            />
          ) : null,
        }}
        stackRef={stack}
      />
    </View>
  );
}

function DayNavigator({
  day,
  onChange,
  onPreviousLongPress,
}: {
  day: string;
  onChange: (day: string) => void;
  onPreviousLongPress?: () => void;
}) {
  const today = localIsoDate();
  const isToday = day === today;
  // A long press may or may not be followed by onPress, depending on the
  // platform; each new touch starts clean.
  const handledLongPress = useRef(false);
  return (
    <View style={styles.rangeCard} testID="logs-day-picker">
      <View style={styles.dayRow}>
        <Pressable
          accessibilityLabel="Previous day"
          accessibilityRole="button"
          delayLongPress={350}
          onLongPress={
            onPreviousLongPress
              ? () => {
                  handledLongPress.current = true;
                  onPreviousLongPress();
                }
              : undefined
          }
          onPress={() => {
            if (!handledLongPress.current) onChange(shiftIsoDate(day, -1));
          }}
          onPressIn={() => {
            handledLongPress.current = false;
          }}
          style={sharedStyles.iconButton}
          testID="logs-day-previous"
        >
          <MaterialCommunityIcons
            color={palette.ink}
            name="chevron-left"
            size={24}
          />
        </Pressable>
        <View style={styles.dayLabelBlock}>
          <Text style={styles.dayLabel} testID="logs-day-label">
            {isToday ? 'Today' : formatDay(day)}
          </Text>
          <Text style={styles.dayDate}>{isToday ? formatDay(day) : day}</Text>
        </View>
        <Pressable
          accessibilityLabel="Next day"
          accessibilityRole="button"
          disabled={isToday}
          onPress={() => onChange(shiftIsoDate(day, 1))}
          style={[sharedStyles.iconButton, isToday && sharedStyles.disabled]}
          testID="logs-day-next"
        >
          <MaterialCommunityIcons
            color={palette.ink}
            name="chevron-right"
            size={24}
          />
        </Pressable>
      </View>
      {!isToday ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(today)}
          style={sharedStyles.secondaryButton}
          testID="logs-day-today"
        >
          <Text style={sharedStyles.secondaryText}>Back to today</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type Loadable<T> = { error?: string; loading: boolean; value?: T };

function WaterCard({
  client,
  configured,
  day,
  fixtures,
}: {
  client: JanuaryClient;
  configured: boolean;
  day: string;
  fixtures: boolean;
}) {
  const [unit, setUnit] = useState<VolumeUnit>('fl_oz');
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<Loadable<DailyWaterTotal | null>>({
    loading: false,
  });
  const [saving, setSaving] = useState(false);
  const [lastLogId, setLastLogId] = useState<string>();
  const [logged, setLogged] = useState<string>();
  const [chartRefresh, setChartRefresh] = useState(0);
  const ticket = useRef(0);

  const load = useCallback(async () => {
    if (!configured) return;
    const current = ++ticket.current;
    setState({ loading: true });
    try {
      const items = fixtures
        ? await listFixtureWaterLogs(day, day, unit, {
            failure: `water:${day}`,
          })
        : (await client.waterLogs.list({ start: day, end: day, unit })).items;
      if (current !== ticket.current) return;
      setState({ loading: false, value: items[0] ?? null });
    } catch (caught) {
      if (current !== ticket.current) return;
      setState({
        loading: false,
        error:
          caught instanceof Error ? caught.message : 'Water failed to load.',
      });
    }
  }, [client, configured, day, fixtures, unit]);

  // A new day starts without a last log to undo; switching the unit only
  // re-reads the same day's total, so the last log stays deletable.
  useEffect(() => {
    setLastLogId(undefined);
    setLogged(undefined);
  }, [day]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  // A log or a delete can finish after the user moved to another day. It must
  // not offer that day an undo for a log it does not have, report on it, or
  // reload with the old day's request; see dayOnScreen.
  const dayOnScreen = useRef(day);
  dayOnScreen.current = day;
  const latestLoad = useRef(load);
  latestLoad.current = load;

  // An amount already typed is converted to the new unit, so what is logged
  // is the quantity the user meant, not the same number in another unit.
  function changeUnit(next: VolumeUnit) {
    setAmount(convertWaterDraft(amount, unit, next));
    setUnit(next);
  }

  async function log() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const loggedDay = day;
    setSaving(true);
    setState((current) => ({ ...current, error: undefined }));
    try {
      const consumedAt = timestampForDay(loggedDay);
      const created = fixtures
        ? await createFixtureWaterLog({ unit, value }, consumedAt)
        : await client.waterLogs.create({
            amount: { unit, value },
            consumedAt,
          });
      // The charts end today, whatever the day on screen.
      setChartRefresh((count) => count + 1);
      if (dayOnScreen.current !== loggedDay) return;
      setLastLogId(created.id);
      setLogged(`Logged ${formatVolume(created.amount.value, unit)}`);
      setAmount('');
      await latestLoad.current();
    } catch (caught) {
      if (dayOnScreen.current !== loggedDay) return;
      setState((current) => ({
        ...current,
        error: caught instanceof Error ? caught.message : 'Water log failed.',
      }));
    } finally {
      setSaving(false);
    }
  }

  async function deleteLast() {
    if (!lastLogId) return;
    const deletedDay = day;
    setSaving(true);
    setState((current) => ({ ...current, error: undefined }));
    try {
      if (fixtures) await deleteFixtureWaterLog(lastLogId);
      else await client.waterLogs.delete(lastLogId);
      setChartRefresh((count) => count + 1);
      if (dayOnScreen.current !== deletedDay) return;
      setLastLogId(undefined);
      setLogged('Deleted the last water log');
      await latestLoad.current();
    } catch (caught) {
      if (dayOnScreen.current !== deletedDay) return;
      setState((current) => ({
        ...current,
        error:
          caught instanceof Error ? caught.message : 'Water delete failed.',
      }));
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || state.loading;
  return (
    <View style={[sharedStyles.card, styles.measureCard]} testID="water-card">
      {state.loading && state.value === undefined ? (
        <View style={styles.loadingLogs} testID="water-loading">
          <ActivityIndicator color={palette.green} size="small" />
          <Text style={styles.loadingLogsText}>Loading water…</Text>
        </View>
      ) : state.value ? (
        <View style={styles.measureTotal} testID="water-total">
          <Text style={styles.measureValue}>
            {formatVolume(state.value.total.value, state.value.total.unit)}
          </Text>
          <Text style={styles.measureCaption}>Total for this day</Text>
        </View>
      ) : state.value === null ? (
        <View style={styles.measureTotal} testID="water-empty">
          <Text style={styles.measureValue}>—</Text>
          <Text style={styles.measureCaption}>No water logged on this day</Text>
        </View>
      ) : null}
      <SegmentedControl
        items={[
          { id: 'fl_oz', label: 'fl oz' },
          { id: 'ml', label: 'ml' },
          { id: 'cup', label: 'cup' },
        ]}
        onSelect={changeUnit}
        selected={unit}
        testIDPrefix="water-unit"
      />
      <View style={styles.measureRow}>
        <TextInput
          accessibilityLabel="Water amount"
          keyboardType={numericKeyboard}
          onSubmitEditing={Keyboard.dismiss}
          returnKeyType="done"
          onChangeText={setAmount}
          placeholder={waterPlaceholder[unit]}
          placeholderTextColor={palette.subdued}
          style={[sharedStyles.input, styles.measureInput]}
          testID="water-amount"
          value={amount}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!configured || busy || !amount.trim()}
          onPress={() => log().catch(() => undefined)}
          style={[
            sharedStyles.primaryButton,
            styles.measureButton,
            (!configured || busy || !amount.trim()) && sharedStyles.disabled,
          ]}
          testID="water-log"
        >
          <Text style={sharedStyles.primaryText}>Log water</Text>
        </Pressable>
      </View>
      {logged ? (
        <Text style={styles.measureLogged} testID="water-logged">
          {logged}
        </Text>
      ) : null}
      {lastLogId ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => deleteLast().catch(() => undefined)}
          style={[sharedStyles.secondaryButton, busy && sharedStyles.disabled]}
          testID="water-delete-last"
        >
          <Text style={sharedStyles.secondaryText}>Delete the last log</Text>
        </Pressable>
      ) : null}
      {state.error ? (
        <View
          accessibilityRole="alert"
          style={sharedStyles.error}
          testID="water-error"
        >
          <Text style={sharedStyles.errorTitle}>
            January couldn’t complete the request
          </Text>
          <Text style={sharedStyles.errorText}>{state.error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              (amount.trim() ? log() : load()).catch(() => undefined)
            }
            style={sharedStyles.secondaryButton}
            testID="water-retry"
          >
            <Text style={sharedStyles.secondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      <WaterChart
        client={client}
        configured={configured}
        fixtures={fixtures}
        refreshKey={chartRefresh}
        unit={unit}
      />
    </View>
  );
}

function WeightCard({
  client,
  configured,
  day,
  fixtures,
}: {
  client: JanuaryClient;
  configured: boolean;
  day: string;
  fixtures: boolean;
}) {
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [value, setValue] = useState('');
  const [state, setState] = useState<Loadable<DailyWeight | null>>({
    loading: false,
  });
  const [saving, setSaving] = useState(false);
  const [logged, setLogged] = useState<string>();
  const [chartRefresh, setChartRefresh] = useState(0);
  const ticket = useRef(0);

  const load = useCallback(async () => {
    if (!configured) return;
    const current = ++ticket.current;
    setState({ loading: true });
    try {
      const items = fixtures
        ? await listFixtureWeightLogs(day, day, { failure: `weight:${day}` })
        : (await client.weightLogs.list({ start: day, end: day })).items;
      if (current !== ticket.current) return;
      setState({ loading: false, value: items[0] ?? null });
    } catch (caught) {
      if (current !== ticket.current) return;
      setState({
        loading: false,
        error:
          caught instanceof Error ? caught.message : 'Weight failed to load.',
      });
    }
  }, [client, configured, day, fixtures]);

  useEffect(() => {
    setLogged(undefined);
    load().catch(() => undefined);
  }, [load]);

  // As on the water card: a log that finishes after the user moved to another
  // day leaves that day alone.
  const dayOnScreen = useRef(day);
  dayOnScreen.current = day;
  const latestLoad = useRef(load);
  latestLoad.current = load;

  // As on the water card: a weight already typed is converted to the new unit.
  function changeUnit(next: WeightUnit) {
    setValue(convertWeightDraft(value, unit, next));
    setUnit(next);
  }

  async function log() {
    const weight = Number(value);
    if (!Number.isFinite(weight) || weight <= 0) return;
    const loggedDay = day;
    setSaving(true);
    setState((current) => ({ ...current, error: undefined }));
    try {
      const measuredAt = timestampForDay(loggedDay);
      const created = fixtures
        ? await createFixtureWeightLog({ unit, value: weight }, measuredAt)
        : await client.weightLogs.create({
            measuredAt,
            weight: { unit, value: weight },
          });
      setChartRefresh((count) => count + 1);
      if (dayOnScreen.current !== loggedDay) return;
      setLogged(`Logged ${formatWeight(created.weight.value, unit)}`);
      setValue('');
      await latestLoad.current();
    } catch (caught) {
      if (dayOnScreen.current !== loggedDay) return;
      setState((current) => ({
        ...current,
        error: caught instanceof Error ? caught.message : 'Weight log failed.',
      }));
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || state.loading;
  return (
    <View style={[sharedStyles.card, styles.measureCard]} testID="weight-card">
      {state.loading && state.value === undefined ? (
        <View style={styles.loadingLogs} testID="weight-loading">
          <ActivityIndicator color={palette.green} size="small" />
          <Text style={styles.loadingLogsText}>Loading weight…</Text>
        </View>
      ) : state.value ? (
        <View style={styles.measureTotal} testID="weight-day">
          <Text style={styles.measureValue}>
            {formatWeight(state.value.weight.value, state.value.weight.unit)}
          </Text>
          <Text style={styles.measureCaption}>Latest measurement this day</Text>
        </View>
      ) : state.value === null ? (
        <View style={styles.measureTotal} testID="weight-empty">
          <Text style={styles.measureValue}>—</Text>
          <Text style={styles.measureCaption}>
            No weight logged on this day
          </Text>
        </View>
      ) : null}
      <SegmentedControl
        items={[
          { id: 'lb', label: 'lb' },
          { id: 'kg', label: 'kg' },
        ]}
        onSelect={changeUnit}
        selected={unit}
        testIDPrefix="weight-unit"
      />
      <View style={styles.measureRow}>
        <TextInput
          accessibilityLabel="Weight"
          keyboardType={numericKeyboard}
          onSubmitEditing={Keyboard.dismiss}
          returnKeyType="done"
          onChangeText={setValue}
          placeholder={unit === 'kg' ? 'e.g. 70' : 'e.g. 150'}
          placeholderTextColor={palette.subdued}
          style={[sharedStyles.input, styles.measureInput]}
          testID="weight-value"
          value={value}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!configured || busy || !value.trim()}
          onPress={() => log().catch(() => undefined)}
          style={[
            sharedStyles.primaryButton,
            styles.measureButton,
            (!configured || busy || !value.trim()) && sharedStyles.disabled,
          ]}
          testID="weight-log"
        >
          <Text style={sharedStyles.primaryText}>Log weight</Text>
        </Pressable>
      </View>
      {logged ? (
        <Text style={styles.measureLogged} testID="weight-logged">
          {logged}
        </Text>
      ) : null}
      {state.error ? (
        <View
          accessibilityRole="alert"
          style={sharedStyles.error}
          testID="weight-error"
        >
          <Text style={sharedStyles.errorTitle}>
            January couldn’t complete the request
          </Text>
          <Text style={sharedStyles.errorText}>{state.error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              (value.trim() ? log() : load()).catch(() => undefined)
            }
            style={sharedStyles.secondaryButton}
            testID="weight-retry"
          >
            <Text style={sharedStyles.secondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      <WeightChart
        client={client}
        configured={configured}
        fixtures={fixtures}
        refreshKey={chartRefresh}
        unit={unit}
      />
    </View>
  );
}

const waterPlaceholder: Record<VolumeUnit, string> = {
  cup: 'e.g. 1.5',
  fl_oz: 'e.g. 8',
  ml: 'e.g. 250',
};

// Cups are logged in eighths (0.125), so keep three decimals for them; the
// API's daily totals already come rounded to one.
function formatVolume(value: number, unit: string): string {
  const scale = unit === 'cup' ? 1000 : 10;
  const rounded = Math.round(value * scale) / scale;
  return `${rounded} ${unit === 'fl_oz' ? 'fl oz' : unit}`;
}

function formatWeight(value: number, unit: string): string {
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function formatSummary(summary: FoodLogSummary): string {
  const { logsCount, nutrients } = summary.totals;
  const parts = [`${logsCount} ${logsCount === 1 ? 'log' : 'logs'}`];
  // Nutrients are sparse: a missing calories entry means nothing could be
  // totalled, which is not the same as 0 kcal.
  const total = nutrients.calories?.value;
  if (total != null) parts.push(`${Math.round(total)} kcal`);
  const average = summary.averagePerLoggedDay.nutrients.calories?.value;
  if (average != null) parts.push(`avg ${Math.round(average)} kcal/day`);
  return parts.join(' · ');
}

function formatDay(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  dayBar: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
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
  browseCopy: { color: palette.body, fontSize: 15, lineHeight: 20 },
  rangeCard: {
    padding: 20,
    borderRadius: 24,
    gap: 14,
    backgroundColor: palette.surface,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLabelBlock: { flex: 1, alignItems: 'center', gap: 2 },
  dayLabel: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  dayDate: { color: palette.muted, fontSize: 13, fontWeight: '600' },
  measureCard: { gap: 14 },
  measureTotal: { gap: 4 },
  measureValue: {
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: '700',
  },
  measureCaption: { color: palette.muted, fontSize: 13, fontWeight: '600' },
  measureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  measureInput: { flex: 1 },
  measureButton: { flexGrow: 0, paddingHorizontal: 18 },
  measureLogged: { color: palette.green, fontSize: 14, fontWeight: '700' },
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
});
