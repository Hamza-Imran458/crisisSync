import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../../../app/navigation/types';
import { theme } from '../../../shared/theme/theme';
import { calculateIncidentConfidence, ConfidenceResult, IncidentIntelligence } from '../../../shared/services/incidentIntelligenceService';
import { auditService } from '../../../shared/services/auditService';
import { evidenceService } from '../../../shared/services/evidenceService';
import { supabase } from '../../../shared/services/supabase';
import { determineEscalation, EscalationResult } from '../../../shared/utils/escalationEngine';
import { determineResponseRecommendation, ResponseRecommendation } from '../../../shared/utils/responseEngine';
import type { AuditLog, IncidentEvidence, ResponseRecord } from '../../../shared/types/app';
import { formatRelativeTime } from '../../../shared/utils/incidentWorkflow';
import { Button } from '../../../shared/components/ui/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'IncidentDetail'>;

export function IncidentDetailScreen({ route, navigation }: Props) {
  const { incidentId, incidentData } = route.params;

  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [evidence, setEvidence] = useState<IncidentEvidence[]>([]);
  const [responseInfo, setResponseInfo] = useState<ResponseRecord | null>(null);
  const [assignedOperator, setAssignedOperator] = useState<string>('Unassigned');
  const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);
  const [escalation, setEscalation] = useState<EscalationResult | null>(null);
  const [responseRec, setResponseRec] = useState<ResponseRecommendation | null>(null);
  const [approving, setApproving] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const verificationStatus = String(incidentData?.status ?? 'Pending');

  const refreshEvidence = async () => {
    if (!incidentData) {
      return;
    }

    const fetchedEvidence = await evidenceService.fetchIncidentEvidence(incidentId);
    setEvidence(fetchedEvidence);
    const conf = calculateIncidentConfidence(incidentData, fetchedEvidence.length > 0, 0);
    setConfidence(conf);
  };

  const handleAddEvidence = async () => {
    try {
      setUploadingEvidence(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uploaded = await evidenceService.uploadIncidentEvidence(incidentId, asset.uri, asset.mimeType || 'application/octet-stream');

      if (!uploaded) {
        Alert.alert('Upload failed', 'Evidence could not be uploaded.');
        return;
      }

      await refreshEvidence();
      Alert.alert('Evidence uploaded', 'Evidence has been added to the incident record.');
    } catch (error) {
      console.warn('Failed to add evidence', error);
      Alert.alert('Upload failed', 'Unable to add evidence for this incident.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fetchedLogs, fetchedEvidence, responseData] = await Promise.all([
          auditService.fetchIncidentAuditLogs(incidentId),
          evidenceService.fetchIncidentEvidence(incidentId),
          supabase.from('responses').select('*').eq('incident_id', incidentId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ]);

        setAuditLogs(fetchedLogs);
        setEvidence(fetchedEvidence);
        const normalizedResponse = responseData?.data ? {
          id: responseData.data.id,
          incidentId: responseData.data.incident_id,
          assignedTo: responseData.data.assigned_to ?? null,
          status: responseData.data.status ?? 'Dispatched',
          notes: responseData.data.notes ?? null,
          createdAt: responseData.data.created_at ?? new Date().toISOString(),
          updatedAt: responseData.data.updated_at ?? responseData.data.created_at ?? new Date().toISOString(),
        } as ResponseRecord : null;
        setResponseInfo(normalizedResponse);

        if (normalizedResponse?.assignedTo) {
          const { data: operatorData } = await supabase.from('profiles').select('full_name, email').eq('id', normalizedResponse.assignedTo).maybeSingle();
          setAssignedOperator(operatorData?.full_name || operatorData?.email || 'Assigned operator');
        } else {
          setAssignedOperator('Unassigned');
        }

        if (incidentData) {
          const conf = calculateIncidentConfidence(incidentData, fetchedEvidence.length > 0, 0);
          setConfidence(conf);
          
          // In Phase 4.1, IncidentIntelligence is partially embedded in incidentData for priority
          const hasPriorityData = (incidentData as any).priorityLevel;
          const priorityLevel = hasPriorityData ? (incidentData as any).priorityLevel : 'Low';
          const priorityScore = hasPriorityData ? (incidentData as any).priorityScore : 0;
          
          const statusNormalized = String(incidentData.status).toLowerCase();
          const esc = determineEscalation({
            priorityScore,
            priorityLevel,
            severity: incidentData.severity ?? 'Medium',
            isVerified: statusNormalized === 'verified' || statusNormalized === 'active',
            distanceKm: incidentData.distanceKm ?? null,
            incidentAgeMinutes: incidentData.createdAt ? (Date.now() - new Date(incidentData.createdAt).getTime()) / 60000 : 15,
            hasEvidence: fetchedEvidence.length > 0,
            similarReportsCount: 0,
            currentStatus: incidentData.status,
          });
          setEscalation(esc);

          const rec = determineResponseRecommendation({
            category: incidentData.category,
            severity: incidentData.severity ?? 'Medium',
            priorityLevel,
            confidenceLevel: conf.confidenceLevel,
            escalationLevel: esc.escalationLevel,
            distanceKm: incidentData.distanceKm ?? null,
            isVerified: statusNormalized === 'verified' || statusNormalized === 'active',
          });
          setResponseRec(rec);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [incidentId, incidentData]);

  const handleApproveResponse = async () => {
    if (!responseRec) return;
    setApproving(true);
    try {
      if (!incidentData) {
        return;
      }

      await auditService.logIncidentEvent({
        incidentId,
        eventType: 'RESPONSE_AUTHORIZED',
        newStatus: incidentData.status,
        note: `Authorized ${responseRec.responseLevel} response: ${responseRec.responseTitle}`
      });
      // Refresh audit logs locally to show immediately
      const fetchedLogs = await auditService.fetchIncidentAuditLogs(incidentId);
      setAuditLogs(fetchedLogs);
    } catch (err) {
      console.warn('Failed to authorize response', err);
    } finally {
      setApproving(false);
    }
  };

  if (!incidentData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: Incident data not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{incidentData.title}</Text>
        <View style={styles.badges}>
          <Text style={[styles.badge, { backgroundColor: theme.colors.primary }]}>{incidentData.category}</Text>
          <Text style={[styles.badge, { backgroundColor: incidentData.severity === 'High' ? theme.colors.error : theme.colors.warning }]}>{incidentData.severity}</Text>
          <Text style={[styles.badge, { backgroundColor: theme.colors.card }]}>{incidentData.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Incident Overview</Text>
        <Text style={styles.description}>{incidentData.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Operational Priority</Text>
        <Text style={styles.confidenceLabel}>
          Level: {(incidentData as any).priorityLevel || 'Low'} 
          <Text style={{ fontWeight: 'normal', color: theme.colors.textMuted }}> (Score: {(incidentData as any).priorityScore || 0}/100)</Text>
        </Text>
        <Text style={styles.description}>{(incidentData as any).priorityExplanation || 'No priority analysis available.'}</Text>
      </View>

      {confidence && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Confidence Assessment</Text>
          <Text style={styles.confidenceLabel}>Level: {confidence.confidenceLevel}</Text>
          <Text style={styles.description}>{confidence.confidenceReason}</Text>
        </View>
      )}

      {escalation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Recommended Action</Text>
          <Text style={[styles.confidenceLabel, { color: escalation.shouldEscalate ? theme.colors.error : theme.colors.text }]}>
            Escalation: {escalation.escalationLevel}
          </Text>
          <Text style={styles.description}>{escalation.recommendedAction}</Text>
          
          {escalation.escalationReasons.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>Factors:</Text>
              {escalation.escalationReasons.map((reason, idx) => (
                <Text key={idx} style={{ color: theme.colors.textMuted }}>• {reason}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {responseRec && (
        <View style={[styles.section, { backgroundColor: responseRec.responseLevel === 'IMMEDIATE' ? theme.colors.softRed : responseRec.responseLevel === 'URGENT' ? theme.colors.softBlue : 'transparent' }]}>
          <Text style={styles.sectionTitle}>5. Recommended Response</Text>
          <Text style={[styles.confidenceLabel, { color: responseRec.responseLevel === 'IMMEDIATE' ? theme.colors.error : responseRec.responseLevel === 'URGENT' ? theme.colors.warning : theme.colors.primary }]}>
            Level: {responseRec.responseLevel}
          </Text>
          <Text style={{ fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 }}>{responseRec.responseTitle}</Text>
          <Text style={styles.description}>{responseRec.responseExplanation}</Text>
          
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>Recommended Actions:</Text>
            {responseRec.recommendedActions.map((action, idx) => (
              <Text key={idx} style={{ color: theme.colors.textMuted, marginTop: 4 }}>• {action}</Text>
            ))}
          </View>
          
          <Button 
            title={approving ? "Authorizing..." : "Authorize Response"} 
            variant="secondary" 
            onPress={handleApproveResponse} 
          />
        </View>
      )}

      {responseInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Response Assignment</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{responseInfo.status}</Text>
          </View>
          <View style={styles.locationContainer}>
            <Text style={styles.label}>Assigned operator:</Text>
            <Text style={styles.value}>{assignedOperator}</Text>
          </View>
          <View style={styles.locationContainer}>
            <Text style={styles.label}>Assigned:</Text>
            <Text style={styles.value}>{formatRelativeTime(responseInfo.createdAt)}</Text>
          </View>
          {responseInfo.notes ? (
            <View style={styles.locationContainer}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{responseInfo.notes}</Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Location & Proximity</Text>
        <View style={styles.locationContainer}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{incidentData.location || 'Location precision unavailable'}</Text>
        </View>

        {incidentData.distanceKm !== null && incidentData.distanceKm !== undefined && (
          <View style={styles.locationContainer}>
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.value}>{incidentData.distanceKm.toFixed(1)} km from you</Text>
          </View>
        )}

        <View style={styles.locationContainer}>
          <Text style={styles.label}>Reported:</Text>
          <Text style={styles.value}>{formatRelativeTime(incidentData.createdAt)}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Evidence & Verification</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Verification status:</Text>
              <Text style={styles.value}>{verificationStatus}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.label}>Evidence count:</Text>
              <Text style={styles.value}>{evidence.length}</Text>
            </View>

            {evidence.length === 0 ? (
              <>
                <Text style={styles.emptyText}>No evidence attached.</Text>
                <View style={{ marginTop: 12 }}>
                  <Button title={uploadingEvidence ? 'Uploading...' : 'Add Evidence'} variant="secondary" onPress={handleAddEvidence} disabled={uploadingEvidence} />
                </View>
              </>
            ) : (
              <>
                {evidence.map(item => {
                  const isImage = item.fileType.toLowerCase().includes('image');
                  const canPreview = item.filePath.startsWith('http://') || item.filePath.startsWith('https://') || item.filePath.startsWith('file://') || item.filePath.startsWith('data:');

                  return (
                    <View key={item.id} style={styles.evidenceCard}>
                      {isImage && canPreview ? (
                        <Image
                          source={{ uri: item.filePath }}
                          style={styles.evidenceImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text style={styles.value}>Type: {item.fileType}</Text>
                      <Text style={styles.value}>Uploaded: {formatRelativeTime(item.createdAt)}</Text>
                      {canPreview ? <Text style={styles.value}>Path: {item.filePath}</Text> : <Text style={styles.value}>Private storage reference retained for audit.</Text>}
                    </View>
                  );
                })}
                <View style={{ marginTop: 12 }}>
                  <Button title={uploadingEvidence ? 'Uploading...' : 'Add Evidence'} variant="secondary" onPress={handleAddEvidence} disabled={uploadingEvidence} />
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Incident Timeline</Text>
            {auditLogs.length === 0 ? (
              <Text style={styles.emptyText}>No history available.</Text>
            ) : (
              [...auditLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(log => (
                <View key={log.id} style={styles.timelineItem}>
                  <Text style={styles.timelineTime}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineEvent}>{log.eventType}</Text>
                    {log.note ? <Text style={styles.timelineNote}>Reason: {log.note}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textMuted,
    lineHeight: 24,
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 80,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  value: {
    flex: 1,
    color: theme.colors.textMuted,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  evidenceCard: {
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  evidenceImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineTime: {
    width: 60,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  timelineContent: {
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    paddingLeft: 12,
  },
  timelineEvent: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  timelineNote: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
});
