import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type BadgeSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'DEFAULT';

type BadgeProps = {
  label: string;
  severity?: BadgeSeverity;
};

export function Badge({ label, severity = 'DEFAULT' }: BadgeProps) {
  const getSeverityColors = () => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: theme.colors.softRed, text: theme.colors.danger };
      case 'HIGH':
        return { bg: '#FEF3C7', text: theme.colors.warning }; // soft amber
      case 'MEDIUM':
        return { bg: theme.colors.softBlue, text: theme.colors.info };
      case 'LOW':
        return { bg: '#D1FAE5', text: theme.colors.success }; // soft green
      default:
        return { bg: '#F1F5F9', text: theme.colors.textMuted }; // slate-100/slate-500
    }
  };

  const { bg, text } = getSeverityColors();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
