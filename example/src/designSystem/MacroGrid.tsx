import { StyleSheet, Text, View } from 'react-native';

import { palette } from '../demoTheme';

export interface MacroValue {
  label: string;
  unit: string;
  value?: number | string | null;
}

interface MacroGridProps {
  values: [MacroValue, MacroValue, MacroValue, MacroValue];
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/MacroGrid.swift. */
export function MacroGrid({ values }: MacroGridProps) {
  return (
    <View style={styles.grid}>
      {values.map(({ label, unit, value }) => (
        <View key={label} style={styles.cell}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{formatValue(value)}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
        </View>
      ))}
      <View pointerEvents="none" style={styles.divider} />
    </View>
  );
}

function formatValue(value: MacroValue['value']): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

const styles = StyleSheet.create({
  grid: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 20,
    rowGap: 28,
  },
  cell: { width: '47%', height: 64, alignItems: 'flex-start', gap: 6 },
  label: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  value: {
    color: palette.ink,
    fontFamily: 'monospace',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
  },
  unit: { color: palette.muted, fontSize: 15, lineHeight: 20 },
  divider: {
    position: 'absolute',
    top: 77,
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
});
