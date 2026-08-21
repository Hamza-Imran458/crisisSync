import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Alert, FlatList, StyleSheet, Text, View, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/types';

import { Button } from '../../../shared/components/ui/Button';
import { SectionHeader } from '../../../shared/components/ui/SectionHeader';
import { MetricCard } from '../../../shared/components/ui/MetricCard';
import { theme } from '../../../shared/theme/theme';

import { fetchEligibleOperators, fetchIncidentsFromDb, subscribeToIncidents, subscribeToResponses, supabase } from '../../../shared/services/supabase';
import { canTransitionIncidentStatus, normalizeIncidentStatus, formatRelativeTime } from '../../../shared/utils/incidentWorkflow';
import { detectPossibleDuplicate } from '../../../shared/utils/crisisIntelligence';
import { verifyIncidentWorkflow, rejectIncidentWorkflow, escalateIncidentWorkflow, resolveIncidentWorkflow } from '../../../shared/services/incidentService';
import { responseService } from '../../../shared/services/responseService';
import { auditService } from '../../../shared/services/auditService';
import type { AuditLog, Incident, ResponseRecord } from '../../../shared/types/app';
import { ResponseAssignModal, type OperatorOption } from '../components/ResponseAssignModal';

import {
  calculateEscalationDistribution,
  calculateCategoryDistribution,
  calculateBacklogMetrics,
  calculateAverageVerificationTime,
  determineOperationalHealth,
} from '../../../shared/services/metricsService';
import type { EscalationLevel } from '../../../shared/utils/escalationEngine';
import { filterAdminIncidents, extractUniqueCategories, AdminStatusFilter, AdminSeverityFilter } from '../../../shared/utils/adminUtils';

export function AdminScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responseMap, setResponseMap] = useState<Record<string, ResponseRecord>>({});
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<Incident | null>(null);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);
  
  // Action state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<AdminSeverityFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const [fetchedIncidents, { data: fetchedLogs }, eligibleOperators] = await Promise.all([
        fetchIncidentsFromDb(),
        supabase.from('incident_audit_logs').select('*').in('event_type', ['STATUS_CHANGE', 'INCIDENT_VERIFIED', 'INCIDENT_ESCALATED']).eq('new_status', 'Verified'),
        fetchEligibleOperators().catch(() => [])
      ]);
      setIncidents((fetchedIncidents || []) as Incident[]);
      setOperators(eligibleOperators);
      setAuditLogs(
        (fetchedLogs || []).map((row: any) => ({
          id: row.id,
          incidentId: row.incident_id,
          eventType: row.event_type,
          previousStatus: row.previous_status,
          newStatus: row.new_status,
          actorId: row.actor_id,
          note: row.note,
          createdAt: row.created_at,
        }))
      );
    } catch (error) {
      Alert.alert('Error', 'Unable to load incidents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const verifyIncident = async (incidentId: string, currentStatus: string) => {
    try {
      setUpdatingId(incidentId);
      const updatedIncident = await verifyIncidentWorkflow(incidentId, currentStatus);
      setIncidents(current => current.map(inc => inc.id === incidentId ? updatedIncident : inc));
      Alert.alert('Success', 'Incident verified successfully.');
    } catch (error) {
      Alert.alert('Verification Failed', 'Unable to verify this incident.');
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectIncident = async (incidentId: string, currentStatus: string) => {
    try {
      setUpdatingId(incidentId);
      const updatedIncident = await rejectIncidentWorkflow(incidentId, rejectReason || 'Rejected by admin', currentStatus);
      setIncidents(current => current.map(inc => inc.id === incidentId ? updatedIncident : inc));
      Alert.alert('Rejected', 'Incident has been rejected.');
    } catch (error) {
      Alert.alert('Rejection Failed', 'Unable to reject this incident.');
    } finally {
      setUpdatingId(null);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  const escalateIncident = async (incidentId: string, currentStatus: string) => {
    try {
      setUpdatingId(incidentId);
      const updatedIncident = await escalateIncidentWorkflow(incidentId, 'Escalated by admin to ACTIVE status', currentStatus);
      setIncidents(current => current.map(inc => inc.id === incidentId ? updatedIncident : inc));
      Alert.alert('Escalated', 'Incident is now active.');
    } catch (error: any) {
      Alert.alert('Escalation Failed', error.message || 'Unable to escalate this incident.');
    } finally {
      setUpdatingId(null);
    }
  };
  
  const resolveIncident = async (incidentId: string, currentStatus: string) => {
    try {
      setUpdatingId(incidentId);
      const updatedIncident = await resolveIncidentWorkflow(incidentId, currentStatus);
      setIncidents(current => current.map(inc => inc.id === incidentId ? updatedIncident : inc));
      Alert.alert('Resolved', 'Incident has been marked as resolved.');
    } catch (error) {
      Alert.alert('Resolution Failed', 'Unable to resolve this incident.');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const incidentChannel = subscribeToIncidents('admin-incidents-channel', 
      newIncident => setIncidents(current => current.some(i => i.id === newIncident.id) ? current : [newIncident as Incident, ...current]),
      updatedIncident => setIncidents(current => current.some(i => i.id === updatedIncident.id) ? current.map(i => i.id === updatedIncident.id ? (updatedIncident as Incident) : i) : [updatedIncident as Incident, ...current]),
      deletedIncident => setIncidents(current => current.filter(i => i.id !== deletedIncident.id))
    );

    const responseChannel = subscribeToResponses('admin-response-channel',
      response => setResponseMap(current => ({ ...current, [response.incidentId]: response })),
      response => setResponseMap(current => ({ ...current, [response.incidentId]: response })),
      response => setResponseMap(current => {
        const next = { ...current };
        delete next[response.incidentId];
        return next;
      })
    );

    return () => {
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(responseChannel);
    };
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // --- Metrics & Pre-processing ---
  const { backlog, health, sortedIncidents, escalationsMap, availableCategories } = useMemo(() => {
    const { escalations: escalationsMap } = calculateEscalationDistribution(incidents);
    const backlog = calculateBacklogMetrics(incidents, escalationsMap);
    const avgLatency = calculateAverageVerificationTime(incidents, auditLogs);
    const health = determineOperationalHealth(backlog, avgLatency);
    const availableCategories = extractUniqueCategories(incidents);

    // Initial Triage Queue Sorting
    const sorted = [...incidents].sort((a, b) => {
      const aEsc = escalationsMap.get(a.id);
      const bEsc = escalationsMap.get(b.id);
      const escValue = { 'CRITICAL': 5, 'URGENT': 4, 'REVIEW': 3, 'MONITOR': 2, 'NONE': 1 };
      
      const aVal = aEsc ? escValue[aEsc.escalationLevel] : 0;
      const bVal = bEsc ? escValue[bEsc.escalationLevel] : 0;
      if (aVal !== bVal) return bVal - aVal; // Higher escalation first

      // Then Pending before Verified/Rejected
      const aPending = normalizeIncidentStatus(a.status) === 'PENDING_REVIEW' ? 1 : 0;
      const bPending = normalizeIncidentStatus(b.status) === 'PENDING_REVIEW' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;

      // Then Recency
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return { backlog, health, sortedIncidents: sorted, escalationsMap, availableCategories };
  }, [incidents, auditLogs]);

  // --- Multi-dimensional Filtering ---
  const displayedIncidents = useMemo(() => {
    return filterAdminIncidents(sortedIncidents, {
      searchQuery,
      status: statusFilter,
      severity: severityFilter,
      category: categoryFilter,
    });
  }, [sortedIncidents, searchQuery, statusFilter, severityFilter, categoryFilter]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Command & Control</Text>
        <Text style={styles.subtitle}>Live Crisis Operations</Text>
      </View>

      <View style={styles.statsRow}>
        <MetricCard title="Total Active" value={backlog.total - backlog.rejected} />
        <MetricCard title="Pending Review" value={backlog.pending} status={backlog.pending > 0 ? 'warning' : 'default'} />
      </View>

      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: health.level === 'CRITICAL' ? theme.colors.error : health.level === 'WARNING' ? theme.colors.warning : health.level === 'WATCH' ? theme.colors.primary : theme.colors.success }]}>
        <Text style={styles.sectionTitle}>Operational Health: {health.level}</Text>
        <Text style={styles.cardText}>{health.explanation}</Text>
      </View>

      <SectionHeader title="Incident Intelligence" subtitle="Search and Filter Reports" />

      {/* FILTER CONTROLS */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, location, or category..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.filterLabel}>Status</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['ALL', 'PENDING', 'VERIFIED', 'ACTIVE', 'REJECTED', 'RESOLVED'] as AdminStatusFilter[]}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setStatusFilter(item)} style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, statusFilter === item && styles.filterChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
          style={styles.filterList}
        />

        <Text style={styles.filterLabel}>Severity</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['ALL', 'High', 'Medium', 'Low'] as AdminSeverityFilter[]}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSeverityFilter(item)} style={[styles.filterChip, severityFilter === item && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, severityFilter === item && styles.filterChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
          style={styles.filterList}
        />

        <Text style={styles.filterLabel}>Category</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['ALL', ...availableCategories]}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setCategoryFilter(item)} style={[styles.filterChip, categoryFilter === item && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, categoryFilter === item && styles.filterChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
          style={styles.filterList}
        />
      </View>
    </View>
  );

  const openDispatchModal = async (incident: Incident) => {
    try {
      setDispatchTarget(incident);
      setSelectedOperatorId('');
      setDispatchNotes('');
      const eligible = await fetchEligibleOperators();
      setOperators(eligible);
      setDispatchModalVisible(true);
    } catch (error: any) {
      Alert.alert('Dispatch unavailable', error?.message || 'Unable to load eligible operators.');
    }
  };

  const confirmDispatch = async () => {
    if (!dispatchTarget || !selectedOperatorId) {
      Alert.alert('Dispatch required', 'Please select an operator before dispatching.');
      return;
    }

    try {
      setDispatching(true);
      const response = await responseService.dispatchResponse({
        incidentId: dispatchTarget.id,
        assignedTo: selectedOperatorId,
        notes: dispatchNotes,
      });
      setResponseMap(current => ({ ...current, [dispatchTarget.id]: response }));
      setDispatchModalVisible(false);
      setDispatchTarget(null);
      setSelectedOperatorId('');
      setDispatchNotes('');
      Alert.alert('Response dispatched', `Assigned to ${selectedOperatorId}.`);
    } catch (error: any) {
      Alert.alert('Dispatch failed', error?.message || 'Unable to dispatch the response.');
    } finally {
      setDispatching(false);
    }
  };

  const renderIncident = ({ item: incident }: { item: Incident }) => {
    const isUpdating = updatingId === incident.id;
    const normalizedStatus = normalizeIncidentStatus(incident.status);
    const esc = escalationsMap.get(incident.id);
    const currentResponse = responseMap[incident.id];
    const duplicateWarning = incidents.some(candidate => candidate.id !== incident.id && detectPossibleDuplicate(
      { category: incident.category, latitude: incident.latitude ?? undefined, longitude: incident.longitude ?? undefined, description: incident.description, createdAt: incident.createdAt },
      { category: candidate.category, latitude: candidate.latitude ?? undefined, longitude: candidate.longitude ?? undefined, description: candidate.description, createdAt: candidate.createdAt }
    ).isPossibleDuplicate);

    const isPending = normalizedStatus === 'PENDING_REVIEW' || normalizedStatus === 'SUBMITTED';
    const isVerified = normalizedStatus === 'VERIFIED';
    const isActive = normalizedStatus === 'ACTIVE';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{incident.title || 'Untitled Report'}</Text>
          {esc && esc.escalationLevel !== 'NONE' && (
            <Text style={[styles.escalationBadge, { color: esc.escalationLevel === 'CRITICAL' ? theme.colors.error : theme.colors.warning }]}>
              {esc.escalationLevel}
            </Text>
          )}
        </View>

        <Text style={styles.metaRow}>
          {incident.category || 'Other'} • {incident.location || 'Unknown Location'} • {formatRelativeTime(incident.createdAt)}
        </Text>

        {currentResponse ? (
          <View style={styles.responseSummary}>
            <Text style={styles.responseSummaryTitle}>Response: {currentResponse.status}</Text>
            {currentResponse.notes ? <Text style={styles.responseSummaryText}>{currentResponse.notes}</Text> : null}
          </View>
        ) : (
          <View style={styles.responseSummary}>
            <Text style={styles.responseSummaryTitle}>No active response</Text>
          </View>
        )}
        
        <View style={styles.badgeRow}>
          <View style={[styles.badgeContainer, { backgroundColor: incident.severity === 'High' ? theme.colors.softRed : theme.colors.softBlue }]}>
            <Text style={[styles.badgeText, { color: incident.severity === 'High' ? theme.colors.error : theme.colors.primary }]}>{incident.severity || 'Medium'}</Text>
          </View>
          <View style={[styles.badgeContainer, { backgroundColor: theme.colors.background }]}>
            <Text style={styles.badgeText}>{normalizedStatus}</Text>
          </View>
        </View>

        {duplicateWarning && (
          <View style={styles.duplicateCard}>
            <Text style={styles.duplicateTitle}>Possible duplicate report</Text>
          </View>
        )}

        <View style={styles.actions}>
          {isPending && (
            <>
              <Button title={isUpdating ? 'Updating...' : 'Verify'} variant="secondary" onPress={() => verifyIncident(incident.id, incident.status)} />
              {rejectingId === incident.id ? (
                <View style={styles.rejectContainer}>
                  <TextInput style={styles.reasonInput} placeholder="Rejection reason..." value={rejectReason} onChangeText={setRejectReason} />
                  <View style={styles.rejectButtons}>
                    <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => { setRejectingId(null); setRejectReason(''); }} /></View>
                    <View style={{ flex: 1 }}><Button title="Confirm Reject" variant="secondary" onPress={() => rejectIncident(incident.id, incident.status)} /></View>
                  </View>
                </View>
              ) : (
                <Button title="Reject" variant="outline" onPress={() => setRejectingId(incident.id)} />
              )}
            </>
          )}

          {isVerified && (
            <>
              <Button title={isUpdating ? 'Escalating...' : 'Escalate to Active'} variant="secondary" onPress={() => escalateIncident(incident.id, incident.status)} />
              <Button title="Dispatch Response" variant="primary" onPress={() => openDispatchModal(incident)} />
            </>
          )}

          {isActive && (
            <Button title={isUpdating ? 'Resolving...' : 'Mark Resolved'} variant="outline" onPress={() => resolveIncident(incident.id, incident.status)} />
          )}

          {!isPending && !isVerified && !isActive && (
            // No direct actions for REJECTED or RESOLVED right now besides details
            null
          )}

          {rejectingId !== incident.id && (
            <Button title="View Details" variant={isPending || isVerified || isActive ? "outline" : "secondary"} onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id, incidentData: incident })} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={displayedIncidents}
        keyExtractor={item => item.id}
        renderItem={renderIncident}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}><Text style={styles.emptyText}>Loading operations...</Text></View>
          ) : (
            <View style={styles.emptyContainer}><Text style={styles.emptyText}>No incidents match the current filters.</Text></View>
          )
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={theme.colors.primary} />}
      />

      <ResponseAssignModal
        visible={dispatchModalVisible}
        incident={dispatchTarget}
        operators={operators}
        selectedOperatorId={selectedOperatorId}
        notes={dispatchNotes}
        loading={dispatching}
        onSelectOperator={setSelectedOperatorId}
        onNotesChange={setDispatchNotes}
        onClose={() => {
          setDispatchModalVisible(false);
          setDispatchTarget(null);
          setSelectedOperatorId('');
          setDispatchNotes('');
        }}
        onConfirm={confirmDispatch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  listContainer: { padding: theme.spacing.xl, gap: theme.spacing.md },
  headerContainer: { gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  heroCard: { backgroundColor: theme.colors.primaryDark, borderRadius: theme.radius.xl, padding: theme.spacing.lg },
  title: { fontSize: theme.typography.h1, fontWeight: '800', color: theme.colors.white },
  subtitle: { fontSize: theme.typography.body, color: theme.colors.softBlue, marginTop: theme.spacing.xs },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  cardTitle: { fontSize: theme.typography.h3, fontWeight: '700', color: theme.colors.text, flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardText: { fontSize: theme.typography.body, color: theme.colors.textMuted, lineHeight: 20 },
  metaRow: { fontSize: theme.typography.caption, color: theme.colors.textMuted, marginBottom: 8 },
  escalationBadge: { fontSize: theme.typography.caption, fontWeight: '800' },
  duplicateCard: { backgroundColor: theme.colors.softRed, borderRadius: theme.radius.md, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.danger, marginTop: 4 },
  duplicateTitle: { fontSize: theme.typography.caption, fontWeight: '700', color: theme.colors.danger, textTransform: 'uppercase' },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: theme.typography.body, color: theme.colors.textMuted },
  rejectContainer: { gap: 8 },
  rejectButtons: { flexDirection: 'row', gap: 8 },
  reasonInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.sm, backgroundColor: theme.colors.background, fontSize: 14 },
  
  // Filters
  filterSection: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm },
  searchInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: 12, fontSize: 16, color: theme.colors.text },
  filterLabel: { fontSize: theme.typography.caption, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginTop: 8 },
  filterList: { marginBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  filterChipTextActive: { color: theme.colors.white },
  
  // Badges
  badgeRow: { flexDirection: 'row', gap: 8 },
  badgeContainer: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border },
  badgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  responseSummary: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.sm },
  responseSummaryTitle: { color: theme.colors.text, fontWeight: '700', marginBottom: 4 },
  responseSummaryText: { color: theme.colors.textMuted, fontSize: 12 },
});