import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../shared/theme/theme';
import { getSeverityColor } from '../../../shared/utils/mapUtils';

const LEGEND_ITEMS = [
  { label: 'High', severity: 'High' },
  { label: 'Medium', severity: 'Medium' },
  { label: 'Low', severity: 'Low' },
] as const;

export function MapLegend() {
  return (
    <View style={styles.container} accessibilityLabel="Incident severity legend">
      <Text style={styles.title}>Severity</Text>
      {LEGEND_ITEMS.map((item) => (
        <View key={item.severity} style={styles.row}>
          <View
            style={[
              styles.dot,
              { backgroundColor: getSeverityColor(item.severity) },
            ]}
          />
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm + 2,
    gap: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
    minWidth: 88,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: theme.radius.full,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
