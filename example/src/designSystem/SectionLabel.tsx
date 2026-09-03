import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { palette } from '../demoTheme';

interface SectionLabelProps {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/SectionLabel.swift. */
export function SectionLabel({
  children,
  color = palette.muted,
  style,
}: SectionLabelProps) {
  return (
    <Text accessibilityRole="header" style={[styles.label, { color }, style]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    paddingHorizontal: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.15,
  },
});
