import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { palette } from '../demoTheme';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  items: SegmentOption<T>[];
  onSelect: (id: T) => void;
  selected: T;
  style?: StyleProp<ViewStyle>;
  testIDPrefix: string;
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/SegmentedControl.swift. */
export function SegmentedControl<T extends string>({
  items,
  onSelect,
  selected,
  style,
  testIDPrefix,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" style={[styles.track, style]}>
      {items.map((item) => {
        const isSelected = item.id === selected;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.segment, isSelected && styles.selected]}
            testID={`${testIDPrefix}-${item.id}`}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: Platform.select({ ios: 32, default: 40 }),
    padding: 2,
    borderRadius: 18,
    flexDirection: 'row',
    backgroundColor: palette.controlStrong,
  },
  segment: {
    minHeight: Platform.select({ ios: 28, default: 36 }),
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: Platform.select({ ios: StyleSheet.hairlineWidth, default: 0 }),
    borderColor: palette.border,
    backgroundColor: palette.surface,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.select({ ios: 0.12, default: 0 }),
    shadowRadius: 2,
  },
  label: {
    color: palette.muted,
    fontSize: Platform.select({ ios: 13, default: 14 }),
    fontWeight: '600',
  },
  selectedLabel: { color: palette.ink, fontWeight: '700' },
});
