import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '../../../shared/components/ui/SectionHeader';
import { theme } from '../../../shared/theme/theme';
import { useAppStore } from '../../../shared/state/appStore';
import { getAlertSeverityLabel, formatRelativeTime, isAlertRelevant } from '../../../shared/utils/incidentWorkflow';
import { buildPriorityScore, calculateDistanceKm, getAlertRelevanceLabel } from '../../../shared/utils/crisisIntelligence';
import { getUserLocationForApp } from '../../../shared/services/incidentIntelligenceService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/types';

export function AlertsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { alerts, alertsLoading, alertsError, profile } = useAppStore();
  const prioritizedAlerts = React.useMemo(() => {
    return [...alerts]
      .map((alert) => {
        const distanceKm = 0.8;
        const relevanceLabel = getAlertRelevanceLabel(distanceKm, profile.notificationRadiusKm);
        const priorityScore = buildPriorityScore({
          severity: alert.severity,
          distanceKm,
          recencyMinutes: 10,
          status: 'VERIFIED',
        });

        return {
          ...alert,
          distanceKm,
          relevanceLabel,
          priorityScore,
        };
      })
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  }, [alerts, profile.notificationRadiusKm]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.title}>Alerts</Text>
          <Text style={styles.subtitle}>
            Live emergency updates for your area.
          </Text>
        </View>

        <SectionHeader
          title="Live alerts"
          subtitle="Critical updates near you"
        />

        {alertsLoading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
            />
            <Text style={styles.statusText}>Loading alerts...</Text>
          </View>
        ) : alertsError ? (
          <View style={styles.statusCard}>
            <Text style={styles.errorTitle}>Unable to load alerts</Text>
            <Text style={styles.errorText}>{alertsError}</Text>
          </View>
        ) : prioritizedAlerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No alerts</Text>
            <Text style={styles.emptyText}>
              There are currently no alerts available.
            </Text>
          </View>
        ) : (
          prioritizedAlerts.map((alert) => (
            <TouchableOpacity 
              key={alert.id} 
              style={styles.alertCard}
              onPress={() => navigation.navigate('AlertDetail', { alertId: alert.id, alertData: alert })}
            >
              <Text style={styles.alertBadge}>
                {getAlertSeverityLabel(alert.severity)}
              </Text>

              <Text style={styles.alertTitle}>
                {alert.title}
              </Text>

              <Text style={styles.alertText}>
                {alert.body}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {formatRelativeTime(alert.createdAt)}
                </Text>
                <Text style={styles.metaText}>
                  {alert.relevanceLabel}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },

  heroCard: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },

  title: {
    fontSize: theme.typography.h1,
    fontWeight: '800',
    color: theme.colors.white,
  },

  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.softBlue,
    marginTop: theme.spacing.xs,
  },

  alertCard: {
    backgroundColor: theme.colors.card,
    borderLeftWidth: 6,
    borderLeftColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  alertBadge: {
    fontSize: theme.typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.danger,
    marginBottom: theme.spacing.xs,
  },

  alertTitle: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  alertText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },

  emptyText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  statusCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },

  statusText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },

  errorTitle: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.danger,
    marginBottom: theme.spacing.xs,
  },

  errorText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});