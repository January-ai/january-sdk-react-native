import { Platform, StyleSheet, Text, View } from 'react-native';

import { palette } from '../demoTheme';

export interface NutritionRowValue {
  label: string;
  value: string;
}

interface NutritionListProps {
  rows: NutritionRowValue[];
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/NutritionList.swift. */
export function NutritionList({ rows }: NutritionListProps) {
  return (
    <View>
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <Text style={styles.text}>{row.label}</Text>
            <Text style={[styles.text, styles.value]}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 42,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    color: palette.ink,
    fontSize: Platform.select({ ios: 17, default: 15 }),
    lineHeight: Platform.select({ ios: 22, default: 21 }),
  },
  value: { fontFamily: 'monospace', textAlign: 'right' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
});
