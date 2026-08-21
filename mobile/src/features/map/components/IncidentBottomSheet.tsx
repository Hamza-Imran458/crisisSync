import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { theme } from '../../../shared/theme/theme';
import {
  getBadgeSeverity,
  getRelativeTime,
  getSeverityColor,
} from '../../../shared/utils/mapUtils';
import { normalizeIncidentStatus } from '../../../shared/utils/incidentWorkflow';
import type { Incident } from '../../../shared/types/app';

type IncidentBottomSheetProps = {
  incident: Incident & {
    escalationLevel?: string;
  };
  onDismiss: () => void;
  onViewDetail: () => void;
};

export function IncidentBottomSheet({
  incident,
  onDismiss,
  onViewDetail,
}: IncidentBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const severityColor = getSeverityColor(incident.severity ?? 'Low');
  const badgeSeverity = getBadgeSeverity(incident.severity ?? '');
  const normalizedStatus = normalizeIncidentStatus(incident.status);
  const relativeTime = getRelativeTime(incident.createdAt);

  // Human-readable status label
  const statusLabel = (() => {
    switch (normalizedStatus) {
      case 'VERIFIED':
      case 'ACTIVE':
        return 'Verified';
      case 'PENDING_REVIEW':
      case 'SUBMITTED':
        return 'Pending';
      case 'REJECTED':
        return 'Rejected';
      case 'RESOLVED':
        return 'Resolved';
      default:
        return normalizedStatus;
    }
  })();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
      ]}
      accessibilityLabel="Incident details"
    >
      {/* Drag handle */}
      <View style={styles.dragHandle} />

      {/* Dismiss row */}
      <View style={styles.topRow}>
        {/* Severity badge */}
        <Badge label={incident.severity ?? 'Unknown'} severity={badgeSeverity} />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close incident details"
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.dismissButton}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: severityColor }]} />

      {/* Category + Title */}
      {incident.category ? (
        <Text style={styles.category}>{incident.category.toUpperCase()}</Text>
      ) : null}
      <Text style={styles.title} numberOfLines={2}>
        {incident.title ?? 'Untitled Incident'}
      </Text>

      {/* Location */}
      {incident.location ? (
        <Text style={styles.location} numberOfLines={1}>
          {incident.location}
        </Text>
      ) : null}

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.statusChip}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <Text style={styles.timestamp}>{relativeTime}</Text>
      </View>

      {/* Description */}
      {incident.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {incident.description}
        </Text>
      ) : null}

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <Button
          title="View Incident"
          variant="primary"
          onPress={onViewDetail}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    ...theme.shadows.lg,
    // Explicit elevation for Android
    elevation: 16,
    zIndex: 50,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.full,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dismissButton: {
    padding: theme.spacing.xs,
  },
  dismissText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  accentBar: {
    height: 3,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  category: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 26,
    marginBottom: theme.spacing.xs,
  },
  location: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statusChip: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  ctaContainer: {
    marginTop: theme.spacing.xs,
  },
});
