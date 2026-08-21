import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { theme } from '../../theme/theme';
import { Badge, BadgeSeverity } from './Badge';

type IncidentCardProps = {
  title: string;
  distance: string;
  severity: string;
  details: string;
  onPress?: () => void;
};

export function IncidentCard({ title, distance, severity, details, onPress }: IncidentCardProps) {
  const content = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Badge label={severity} severity={severity.toUpperCase() as BadgeSeverity} />
      </View>
      <Text style={styles.distance}>{distance}</Text>
      <Text style={styles.details} numberOfLines={2}>{details}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  distance: {
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  details: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
});
