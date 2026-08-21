import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function MetricCard({ title, value, subtitle, status = 'default' }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      case 'info': return theme.colors.info;
      default: return theme.colors.text;
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: getStatusColor() }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  value: {
    fontSize: theme.typography.h2,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
