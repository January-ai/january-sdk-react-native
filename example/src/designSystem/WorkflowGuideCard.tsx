import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, serifFont } from '../demoTheme';
import { AppCard } from './AppCard';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface WorkflowGuideCardProps {
  icon: IconName;
  message: string;
  steps: string[];
  testID?: string;
  title: string;
}

/** Mirrors JanuaryPartnerDemo/DesignSystem/WorkflowGuideCard.swift. */
export function WorkflowGuideCard({
  icon,
  message,
  steps,
  testID,
  title,
}: WorkflowGuideCardProps) {
  return (
    <AppCard style={styles.card} testID={testID}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <MaterialCommunityIcons color={palette.green} name={icon} size={20} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.numberBadge}>
              <Text style={styles.number}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 18,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  copy: { flex: 1, gap: 5 },
  title: {
    color: palette.ink,
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 30,
  },
  message: { color: palette.body, fontSize: 15, lineHeight: 20 },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.targetBand,
  },
  number: { color: palette.green, fontSize: 13, fontWeight: '700' },
  stepText: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
});
