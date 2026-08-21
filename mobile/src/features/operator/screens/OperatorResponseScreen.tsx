import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../shared/components/ui/Button';
import { theme } from '../../../shared/theme/theme';
import { responseService } from '../../../shared/services/responseService';
import type { ResponseRecord } from '../../../shared/types/app';
import { formatRelativeTime } from '../../../shared/utils/incidentWorkflow';

export function OperatorResponseScreen() {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ResponseRecord | null>(null);
  const [working, setWorking] = useState(false);

  const loadResponse = async () => {
    setLoading(true);
    try {
      const list = await responseService.fetchResponsesForUser();
      setResponse(list[0] ?? null);
    } catch (error: any) {
      Alert.alert('Unable to load assignment', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponse();
  }, []);

  const statusLabel = response?.status ?? 'No assignment';

  const actionConfig = useMemo(() => {
    if (!response) return [];

    const actions: Array<{ label: string; handler: () => Promise<void>; enabled: boolean }> = [];

    if (response.status === 'Dispatched') {
      actions.push({ label: 'ACKNOWLEDGE', handler: async () => { await responseService.ackResponse(response.id); await loadResponse(); }, enabled: true });
    }

    if (response.status === 'Acknowledged') {
      actions.push({ label: 'ON SCENE', handler: async () => { await responseService.markResponseOnScene(response.id); await loadResponse(); }, enabled: true });
    }

    if (response.status === 'On Scene') {
      actions.push({ label: 'COMPLETE', handler: async () => { await responseService.completeResponse(response.id); await loadResponse(); }, enabled: true });
    }

    return actions;
  }, [response]);

  const runAction = async (handler: () => Promise<void>) => {
    try {
      setWorking(true);
      await handler();
    } catch (error: any) {
      Alert.alert('Action unavailable', error?.message || 'This action cannot be completed right now.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!response) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No active assignments</Text>
          <Text style={styles.emptyText}>You do not currently have any assigned response work.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{response.incidentId}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{statusLabel}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Assignment Details</Text>
          <Text style={styles.row}><Text style={styles.label}>Assigned:</Text> {formatRelativeTime(response.createdAt)}</Text>
          <Text style={styles.row}><Text style={styles.label}>Status:</Text> {response.status}</Text>
          {response.notes ? <Text style={styles.row}><Text style={styles.label}>Notes:</Text> {response.notes}</Text> : null}
        </View>

        {actionConfig.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.heading}>Actions</Text>
            {actionConfig.map((item) => (
              <View key={item.label} style={styles.actionWrap}>
                <Button
                  title={working ? 'Processing...' : item.label}
                  variant="secondary"
                  onPress={() => runAction(item.handler)}
                  disabled={working || !item.enabled}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.xl, gap: theme.spacing.md },
  title: { fontSize: theme.typography.h2, fontWeight: '800', color: theme.colors.text },
  badgeRow: { flexDirection: 'row', gap: theme.spacing.sm },
  badge: { backgroundColor: theme.colors.softBlue, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  badgeText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm },
  heading: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  row: { color: theme.colors.textMuted, fontSize: 14 },
  label: { fontWeight: '700', color: theme.colors.text },
  actionWrap: { marginTop: theme.spacing.sm },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  emptyTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '700', marginBottom: theme.spacing.sm },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
