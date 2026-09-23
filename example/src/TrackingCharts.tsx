import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type {
  DailyWaterTotal,
  DailyWeight,
  JanuaryClient,
  VolumeUnit,
  WeightUnit,
} from '@januaryai/react-native';

import { palette, sharedStyles } from './demoTheme';
import {
  failFixtureRequestsOnce,
  listFixtureWaterLogs,
  listFixtureWeightLogs,
} from './e2eFixtures';
import {
  axisLabelIndexes,
  chartRanges,
  daysIn,
  dayOffset,
  fetchInChunks,
  formatChartDate,
  formatChartValue,
  monthlyBars,
  niceCeiling,
  resolveChartRange,
  waterBars,
  waterSummary,
  weightPoints,
  weightSummary,
  type ChartRange,
  type DateRange,
} from './trackingChartData';

const PLOT_HEIGHT = 140;
const DENSE_GAP = 2;
const WIDE_GAP = 6;

interface ChartProps<Unit extends string> {
  client: JanuaryClient;
  configured: boolean;
  fixtures: boolean;
  /** Bumped by the card after every log or delete, to read the range again. */
  refreshKey: number;
  unit: Unit;
}

/**
 * Weight over the last week, month, or year as a line: one point per day with
 * a weight, each converted from the unit it was logged in to the card's unit.
 */
export function WeightChart({
  client,
  configured,
  fixtures,
  refreshKey,
  unit,
}: ChartProps<WeightUnit>) {
  const fetchChunk = useCallback(
    async (chunk: DateRange, emptyHistory: boolean) =>
      fixtures
        ? listFixtureWeightLogs(chunk.start, chunk.end, {
            emptyHistory,
            failure: 'weight-chart',
          })
        : (await client.weightLogs.list(chunk)).items,
    [client, fixtures]
  );
  // Weights come back in the unit they were logged in and are converted here,
  // so a unit change redraws without another request.
  const chart = useRangeData<DailyWeight>(
    configured,
    fetchChunk,
    `${refreshKey}`
  );
  const points = useMemo(
    () => weightPoints(chart.items ?? [], chart.dates, unit),
    [chart.dates, chart.items, unit]
  );

  return (
    <ChartFrame
      chart={chart}
      emptyMessage="No weight logged in this range"
      hasData={points.length > 0}
      onLongPress={
        fixtures ? failOnceAndReload(chart, 'weight-chart') : undefined
      }
      summary={weightSummary(points, chart.range, unit)}
      testIDPrefix="weight-chart"
      title="Weight trend"
    >
      <WeightLine
        dates={chart.dates}
        points={points}
        range={chart.range}
        unit={unit}
      />
    </ChartFrame>
  );
}

/**
 * Daily water totals as bars: 7 days for a week, 30 for a month (a day with
 * nothing logged is an empty slot), and 12 monthly sums for a year. Totals are
 * requested in the card's unit, so a unit change reads the range again.
 */
export function WaterChart({
  client,
  configured,
  fixtures,
  refreshKey,
  unit,
}: ChartProps<VolumeUnit>) {
  const fetchChunk = useCallback(
    async (chunk: DateRange, emptyHistory: boolean) =>
      fixtures
        ? listFixtureWaterLogs(chunk.start, chunk.end, unit, {
            emptyHistory,
            failure: 'water-chart',
          })
        : (await client.waterLogs.list({ ...chunk, unit })).items,
    [client, fixtures, unit]
  );
  const chart = useRangeData<DailyWaterTotal>(
    configured,
    fetchChunk,
    `${refreshKey}-${unit}`
  );
  const bars = useMemo(
    () => waterBars(chart.items ?? [], chart.range, chart.dates),
    [chart.dates, chart.items, chart.range]
  );
  const label = volumeLabel(unit);

  return (
    <ChartFrame
      chart={chart}
      emptyMessage="No water logged in this range"
      hasData={bars.some((bar) => bar.logged)}
      onLongPress={
        fixtures ? failOnceAndReload(chart, 'water-chart') : undefined
      }
      summary={waterSummary(bars, chart.range, label)}
      testIDPrefix="water-chart"
      title="Water by day"
    >
      <WaterBars bars={bars} range={chart.range} unitLabel={label} />
    </ChartFrame>
  );
}

/**
 * Fixture mode only: a long press on a drawn chart reloads it with its first
 * request failing, so a flow can reach the chart's loading, error, and retry
 * states.
 */
function failOnceAndReload<T>(chart: RangeData<T>, request: string) {
  return () => {
    failFixtureRequestsOnce(request);
    chart.retry();
  };
}

interface RangeData<T> {
  dates: DateRange;
  error?: string;
  items?: T[];
  loading: boolean;
  range: ChartRange;
  retry: () => void;
  select: (range: ChartRange) => void;
  /** Fixture mode only: show the range as an end user with no logs sees it. */
  selectEmpty: (range: ChartRange) => void;
}

/**
 * Loads the selected range, which always ends today (local), whatever day the
 * Tracking picker shows. A range longer than one request allows is fetched in
 * consecutive chunks and merged in order. The newest request wins.
 */
function useRangeData<T extends { date: string }>(
  configured: boolean,
  fetchChunk: (chunk: DateRange, emptyHistory: boolean) => Promise<T[]>,
  refreshKey: string
): RangeData<T> {
  const [range, setRange] = useState<ChartRange>('week');
  const [emptyHistory, setEmptyHistory] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    dates: DateRange;
    error?: string;
    items?: T[];
    loading: boolean;
  }>(() => ({ dates: resolveChartRange('week'), loading: false }));
  const ticket = useRef(0);

  useEffect(() => {
    if (!configured) return;
    const current = ++ticket.current;
    const dates = resolveChartRange(range);
    setState({ dates, loading: true });
    fetchInChunks(dates, (chunk) => fetchChunk(chunk, emptyHistory))
      .then((items) => {
        if (current === ticket.current)
          setState({ dates, items, loading: false });
      })
      .catch((caught: unknown) => {
        if (current !== ticket.current) return;
        setState({
          dates,
          loading: false,
          error:
            caught instanceof Error
              ? caught.message
              : 'The chart failed to load.',
        });
      });
  }, [attempt, configured, emptyHistory, fetchChunk, range, refreshKey]);

  return {
    ...state,
    range,
    retry: () => setAttempt((value) => value + 1),
    select: (next) => {
      setEmptyHistory(false);
      setRange(next);
    },
    selectEmpty: (next) => {
      setEmptyHistory(true);
      setRange(next);
    },
  };
}

function ChartFrame<T>({
  chart,
  children,
  emptyMessage,
  hasData,
  onLongPress,
  summary,
  testIDPrefix,
  title,
}: {
  chart: RangeData<T>;
  children: ReactNode;
  emptyMessage: string;
  hasData: boolean;
  onLongPress?: () => void;
  summary: string;
  testIDPrefix: string;
  title: string;
}) {
  const chartProps = {
    accessibilityLabel: summary,
    accessibilityRole: 'image' as const,
    accessible: true,
    testID: testIDPrefix,
  };
  return (
    <View style={styles.frame}>
      <View style={styles.frameHeader}>
        <Text accessibilityRole="header" style={styles.frameTitle}>
          {title}
        </Text>
        <RangeSwitch chart={chart} testIDPrefix={testIDPrefix} />
      </View>
      {chart.loading ? (
        <View style={styles.placeholder} testID={`${testIDPrefix}-loading`}>
          <ActivityIndicator color={palette.green} size="small" />
          <Text style={styles.placeholderText}>Loading the chart…</Text>
        </View>
      ) : chart.error ? (
        <View
          accessibilityRole="alert"
          style={sharedStyles.error}
          testID={`${testIDPrefix}-error`}
        >
          <Text style={sharedStyles.errorTitle}>
            January couldn’t complete the request
          </Text>
          <Text style={sharedStyles.errorText}>{chart.error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={chart.retry}
            style={sharedStyles.secondaryButton}
            testID={`${testIDPrefix}-retry`}
          >
            <Text style={sharedStyles.secondaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : chart.items && !hasData ? (
        <View style={styles.placeholder} testID={`${testIDPrefix}-empty`}>
          <Text style={styles.placeholderText}>{emptyMessage}</Text>
        </View>
      ) : chart.items && onLongPress ? (
        <Pressable
          delayLongPress={350}
          onLongPress={onLongPress}
          {...chartProps}
        >
          {children}
        </Pressable>
      ) : chart.items ? (
        <View {...chartProps}>{children}</View>
      ) : null}
    </View>
  );
}

function RangeSwitch<T>({
  chart,
  testIDPrefix,
}: {
  chart: RangeData<T>;
  testIDPrefix: string;
}) {
  // A long press is how the fixture flows reach the empty state: in fixture
  // mode it shows the range as an end user with no logs would see it.
  const handledLongPress = useRef(false);
  return (
    <View style={styles.rangeTrack}>
      {chartRanges.map((item) => {
        const selected = item.id === chart.range;
        return (
          <Pressable
            accessibilityLabel={`${item.label} range`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            delayLongPress={350}
            key={item.id}
            onLongPress={() => {
              handledLongPress.current = true;
              chart.selectEmpty(item.id);
            }}
            onPress={() => {
              if (!handledLongPress.current) chart.select(item.id);
            }}
            // A long press may or may not be followed by onPress, depending
            // on the platform; each new touch starts clean.
            onPressIn={() => {
              handledLongPress.current = false;
            }}
            style={[styles.rangeButton, selected && styles.rangeSelected]}
            testID={`${testIDPrefix}-range-${item.id}`}
          >
            <Text
              style={[styles.rangeText, selected && styles.rangeTextSelected]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WeightLine({
  dates,
  points,
  range,
  unit,
}: {
  dates: DateRange;
  points: { date: string; value: number }[];
  range: ChartRange;
  unit: string;
}) {
  const [width, setWidth] = useState(0);
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const latest = points[points.length - 1];
  // Pad the value axis so a flat line sits in the middle, not on an edge.
  const padding = Math.max((high - low) * 0.15, 0.5);
  const bottom = low - padding;
  const top = high + padding;
  const span = Math.max(dayOffset(dates.start, dates.end), 1);
  const inset = 6;
  const x = (day: string) =>
    inset +
    (dayOffset(dates.start, day) / span) * Math.max(width - inset * 2, 0);
  const y = (value: number) =>
    inset + ((top - value) / (top - bottom)) * (PLOT_HEIGHT - inset * 2);
  const path = points
    .map(
      (point, index) => `${index ? 'L' : 'M'}${x(point.date)},${y(point.value)}`
    )
    .join(' ');
  const labels = lineAxisLabels(dates, range).map((label) => ({
    ...label,
    fraction: dayOffset(dates.start, label.day) / span,
  }));

  return (
    <View style={styles.chartBody}>
      <View style={styles.statsRow}>
        <Stat
          label="Latest"
          value={`${formatChartValue(latest?.value ?? 0)} ${unit}`}
        />
        <Stat label="Low" value={`${formatChartValue(low)} ${unit}`} />
        <Stat label="High" value={`${formatChartValue(high)} ${unit}`} />
      </View>
      <View
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
        style={styles.plot}
      >
        {width > 0 ? (
          <Svg height={PLOT_HEIGHT} width={width}>
            <Line
              stroke={palette.divider}
              strokeWidth={1}
              x1={0}
              x2={width}
              y1={y(high)}
              y2={y(high)}
            />
            <Line
              stroke={palette.divider}
              strokeWidth={1}
              x1={0}
              x2={width}
              y1={y(low)}
              y2={y(low)}
            />
            <Path
              d={path}
              fill="none"
              stroke={palette.green}
              strokeLinejoin="round"
              strokeWidth={2.5}
            />
            {points.length <= 31
              ? points.map((point) => (
                  <Circle
                    cx={x(point.date)}
                    cy={y(point.value)}
                    fill={palette.surface}
                    key={point.date}
                    r={3.5}
                    stroke={palette.green}
                    strokeWidth={2}
                  />
                ))
              : null}
            {latest ? (
              <Circle
                cx={x(latest.date)}
                cy={y(latest.value)}
                fill={palette.green}
                r={4.5}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <AxisLabels labels={labels} width={width} />
    </View>
  );
}

function WaterBars({
  bars,
  range,
  unitLabel,
}: {
  bars: { key: string; logged: boolean; start: string; value: number }[];
  range: ChartRange;
  unitLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const most = Math.max(...bars.map((bar) => bar.value), 0);
  const ceiling = niceCeiling(most);
  const total = bars.reduce((sum, bar) => sum + bar.value, 0);
  const logged = bars.filter((bar) => bar.logged).length;
  const labels = axisLabelIndexes(bars.length, range).map((index) => {
    const bar = bars[index]!;
    return {
      day: bar.start,
      fraction: bars.length > 1 ? index / (bars.length - 1) : 0.5,
      text: formatChartDate(
        bar.start,
        range === 'week' ? 'weekday' : range === 'month' ? 'day' : 'month'
      ),
    };
  });

  return (
    <View style={styles.chartBody}>
      <View style={styles.statsRow}>
        <Stat label="Total" value={`${formatChartValue(total)} ${unitLabel}`} />
        <Stat
          label={range === 'year' ? 'Most in a month' : 'Most in a day'}
          value={`${formatChartValue(most)} ${unitLabel}`}
        />
        <Stat
          label={range === 'year' ? 'Months logged' : 'Days logged'}
          value={`${logged} of ${bars.length}`}
        />
      </View>
      <View
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
        style={[styles.plot, styles.barPlot]}
      >
        <Text style={styles.ceilingLabel}>
          {formatChartValue(ceiling)} {unitLabel}
        </Text>
        <View
          style={[
            styles.barRow,
            bars.length > 12 ? styles.barRowDense : styles.barRowWide,
          ]}
        >
          {bars.map((bar) => (
            <View key={bar.key} style={styles.barSlot}>
              <View
                style={[
                  bar.logged ? styles.barFill : styles.barEmpty,
                  bar.logged && {
                    height: Math.max((bar.value / ceiling) * PLOT_HEIGHT, 2),
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>
      <AxisLabels
        inset={barInset(bars.length, width)}
        labels={labels}
        width={width}
      />
    </View>
  );
}

/** Half a bar's width, so bar labels sit under the bar centres. */
function barInset(count: number, width: number): number {
  if (count === 0 || width === 0) return 0;
  const gap = count > 12 ? DENSE_GAP : WIDE_GAP;
  return (width - gap * (count - 1)) / count / 2;
}

function lineAxisLabels(
  dates: DateRange,
  range: ChartRange
): { day: string; text: string }[] {
  if (range === 'year') {
    const months = monthlyBars([], dates);
    return axisLabelIndexes(months.length, 'year').map((index) => ({
      day: months[index]!.start,
      text: formatChartDate(months[index]!.start, 'month'),
    }));
  }
  const days = daysIn(dates);
  return axisLabelIndexes(days.length, range).map((index) => ({
    day: days[index]!,
    text: formatChartDate(days[index]!, range === 'week' ? 'weekday' : 'day'),
  }));
}

const LABEL_WIDTH = 48;

function AxisLabels({
  inset = 6,
  labels,
  width,
}: {
  inset?: number;
  labels: { day: string; fraction: number; text: string }[];
  width: number;
}) {
  if (width === 0) return <View style={styles.axis} />;
  const usable = Math.max(width - inset * 2, 0);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.axis}
    >
      {labels.map((label) => {
        const centre = inset + label.fraction * usable;
        const left = Math.min(
          Math.max(centre - LABEL_WIDTH / 2, 0),
          width - LABEL_WIDTH
        );
        return (
          <Text
            key={label.day}
            numberOfLines={1}
            style={[styles.axisLabel, { left }]}
          >
            {label.text}
          </Text>
        );
      })}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function volumeLabel(unit: string): string {
  return unit === 'fl_oz' ? 'fl oz' : unit;
}

const styles = StyleSheet.create({
  frame: {
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  frameHeader: { gap: 10 },
  frameTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  rangeTrack: {
    padding: 2,
    borderRadius: 18,
    flexDirection: 'row',
    backgroundColor: palette.controlStrong,
  },
  rangeButton: {
    minHeight: 36,
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeSelected: { backgroundColor: palette.surface },
  rangeText: { color: palette.muted, fontSize: 14, fontWeight: '600' },
  rangeTextSelected: { color: palette.ink, fontWeight: '700' },
  placeholder: {
    minHeight: PLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: palette.targetBand,
  },
  placeholderText: { color: palette.muted, fontSize: 15, fontWeight: '600' },
  chartBody: { gap: 8 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2 },
  statLabel: { color: palette.muted, fontSize: 12, fontWeight: '600' },
  statValue: {
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
  plot: { height: PLOT_HEIGHT },
  barPlot: {
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  ceilingLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    color: palette.subdued,
    fontSize: 11,
    fontWeight: '600',
  },
  barRow: { height: PLOT_HEIGHT, flexDirection: 'row', alignItems: 'flex-end' },
  barRowDense: { gap: DENSE_GAP },
  barRowWide: { gap: WIDE_GAP },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  barFill: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: palette.green,
  },
  barEmpty: { height: 2, backgroundColor: palette.border },
  axis: { height: 16 },
  axisLabel: {
    position: 'absolute',
    width: LABEL_WIDTH,
    color: palette.muted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
