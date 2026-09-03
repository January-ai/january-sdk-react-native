import type { PropsWithChildren } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { palette } from '../demoTheme';

interface AppCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/CardStyle.swift. */
export function AppCard({ children, style, testID }: AppCardProps) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Platform.select({ ios: 22, default: 20 }),
    borderWidth: 1,
    borderColor: 'rgba(29,26,20,0.06)',
    borderRadius: 24,
    gap: 12,
    backgroundColor: palette.surface,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.select({ ios: 0.08, default: 0 }),
    shadowRadius: 20,
  },
});
