import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { palette, serifFont } from '../demoTheme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface EmptyStateCardProps {
  icon: IconName;
  message: string;
  testID?: string;
  title: string;
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/EmptyStateCard.swift. */
export function EmptyStateCard({
  icon,
  message,
  testID,
  title,
}: EmptyStateCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <MaterialCommunityIcons
        color={palette.green}
        name={icon}
        size={Platform.select({ ios: 24, default: 25 })}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: Platform.select({ ios: undefined, default: 164 }),
    paddingVertical: Platform.select({ ios: 34, default: 22 }),
    paddingHorizontal: Platform.select({ ios: 20, default: 22 }),
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: Platform.select({ ios: 28, default: 24 }),
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.select({ ios: 10, default: 8 }),
    backgroundColor: palette.surface,
  },
  title: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  message: {
    color: palette.body,
    fontSize: Platform.select({ ios: 17, default: 15 }),
    lineHeight: Platform.select({ ios: 22, default: 21 }),
    textAlign: 'center',
  },
});
