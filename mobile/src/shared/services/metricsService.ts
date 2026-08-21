import type { Incident, AuditLog } from '../types/app';
import { determineEscalation, EscalationLevel, EscalationResult } from '../utils/escalationEngine';
import { calculateCrisisPriority } from '../utils/crisisIntelligence';
import { normalizeIncidentStatus } from '../utils/incidentWorkflow';

export type EscalationDistribution = Record<EscalationLevel, number>;
export type CategoryDistribution = Record<string, number>;

export type BacklogMetrics = {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  pendingHighSeverity: number;
  pendingCriticalEscalation: number;
  pendingUrgentEscalation: number;
};

export type AverageVerificationTime = {
  value: number | null; // in minutes
  label: string;
};

export type OperationalHealthLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';

export type OperationalHealth = {
  level: OperationalHealthLevel;
  explanation: string;
};

/**
 * Calculates the escalation distribution for a list of incidents.
 */
export function calculateEscalationDistribution(
  incidents: Incident[]
): { distribution: EscalationDistribution; escalations: Map<string, EscalationResult> } {
  const distribution: EscalationDistribution = {
    CRITICAL: 0,
    URGENT: 0,
    REVIEW: 0,
    MONITOR: 0,
    NONE: 0,
  };
  const escalations = new Map<string, EscalationResult>();

  for (const incident of incidents) {
    const recencyMinutes = incident.createdAt
      ? (Date.now() - new Date(incident.createdAt).getTime()) / 60000
      : 15;

    const raw = incident as any;

    // Use priority if already attached, or fallback to recalculating
    const priority = (incident as any).priorityLevel
      ? { level: (incident as any).priorityLevel, score: (incident as any).priorityScore }
      : (() => {
          const res = calculateCrisisPriority({
            severity: incident.severity ?? 'Medium',
            distanceKm: raw.distance_km ?? incident.distanceKm ?? null,
            recencyMinutes,
            status: incident.status,
            hasEvidence: false,
            similarReportsCount: 0,
          });
          return { level: res.priorityLevel, score: res.priorityScore };
        })();

    const escalation = determineEscalation({
      priorityScore: priority.score,
      priorityLevel: priority.level as any,
      severity: incident.severity ?? 'Medium',
      isVerified: normalizeIncidentStatus(incident.status) === 'VERIFIED' || normalizeIncidentStatus(incident.status) === 'ACTIVE',
      distanceKm: raw.distance_km ?? incident.distanceKm ?? null,
      incidentAgeMinutes: recencyMinutes,
      hasEvidence: false, // Phase 4.3 mock
      similarReportsCount: 0, // Phase 4.3 mock
      currentStatus: incident.status,
    });

    distribution[escalation.escalationLevel]++;
    escalations.set(incident.id, escalation);
  }

  return { distribution, escalations };
}

/**
 * Calculates the category distribution for a list of incidents.
 */
export function calculateCategoryDistribution(incidents: Incident[]): CategoryDistribution {
  const distribution: CategoryDistribution = {};
  for (const incident of incidents) {
    const cat = incident.category?.trim() || 'Unknown';
    if (!distribution[cat]) {
      distribution[cat] = 0;
    }
    distribution[cat]++;
  }
  return distribution;
}

/**
 * Calculates verification backlog metrics.
 */
export function calculateBacklogMetrics(
  incidents: Incident[],
  escalations: Map<string, EscalationResult>
): BacklogMetrics {
  const metrics: BacklogMetrics = {
    total: incidents.length,
    pending: 0,
    verified: 0,
    rejected: 0,
    pendingHighSeverity: 0,
    pendingCriticalEscalation: 0,
    pendingUrgentEscalation: 0,
  };

  for (const incident of incidents) {
    const status = normalizeIncidentStatus(incident.status);
    const isPending = status === 'PENDING_REVIEW' || status === 'SUBMITTED';

    if (isPending) metrics.pending++;
    else if (status === 'VERIFIED' || status === 'ACTIVE') metrics.verified++;
    else if (status === 'REJECTED' || status === 'RESOLVED') metrics.rejected++;

      if (isPending) {
      if (incident.severity === 'High') {
        metrics.pendingHighSeverity++;
      }
      const escalation = escalations.get(incident.id)?.escalationLevel;
      if (escalation === 'CRITICAL') metrics.pendingCriticalEscalation++;
      else if (escalation === 'URGENT') metrics.pendingUrgentEscalation++;
    }
  }

  return metrics;
}

/**
 * Calculates average verification time based on audit logs.
 */
export function calculateAverageVerificationTime(
  incidents: Incident[],
  auditLogs: AuditLog[] // Only passing logs for verified incidents is ideal
): AverageVerificationTime {
  const verifiedIncidents = incidents.filter(i => {
    const s = normalizeIncidentStatus(i.status);
    return s === 'VERIFIED' || s === 'ACTIVE';
  });

  if (verifiedIncidents.length === 0) {
    return { value: null, label: 'Insufficient data' };
  }

  let totalMinutes = 0;
  let count = 0;

  for (const incident of verifiedIncidents) {
    const createdTime = new Date(incident.createdAt).getTime();
    if (isNaN(createdTime)) continue;

    // Find verification log. Support both the legacy status-change event and the explicit verification event.
    const verificationLog = auditLogs.find(log => {
      if (log.incidentId !== incident.id) {
        return false;
      }

      const isLegacyStatusChange = log.eventType === 'STATUS_CHANGE' && normalizeIncidentStatus(log.newStatus) === 'VERIFIED';
      const isExplicitVerification = log.eventType === 'INCIDENT_VERIFIED' && normalizeIncidentStatus(log.newStatus) === 'VERIFIED';
      return isLegacyStatusChange || isExplicitVerification;
    });

    let verifiedTime = 0;
    if (verificationLog && verificationLog.createdAt) {
      verifiedTime = new Date(verificationLog.createdAt).getTime();
    } else if (incident.updatedAt) {
      // Graceful fallback
      verifiedTime = new Date(incident.updatedAt).getTime();
    }

    if (verifiedTime > 0 && verifiedTime >= createdTime) {
      totalMinutes += (verifiedTime - createdTime) / 60000;
      count++;
    }
  }

  if (count === 0) {
    return { value: null, label: 'Insufficient data' };
  }

  return { value: Math.round(totalMinutes / count), label: 'Based on verified incidents' };
}

/**
 * Deterministically evaluates operational health.
 */
export function determineOperationalHealth(
  backlog: BacklogMetrics,
  avgVerificationTime: AverageVerificationTime
): OperationalHealth {
  // CRITICAL: 
  // - Pending critical >= 1 OR 
  // - Pending urgent >= 3 OR
  // - Pending > 20 and Verification > 60 mins
  if (backlog.pendingCriticalEscalation >= 1) {
    return { level: 'CRITICAL', explanation: `${backlog.pendingCriticalEscalation} CRITICAL incident(s) awaiting verification.` };
  }
  if (backlog.pendingUrgentEscalation >= 3) {
    return { level: 'CRITICAL', explanation: `${backlog.pendingUrgentEscalation} URGENT incidents awaiting verification.` };
  }
  if (backlog.pending >= 20 && avgVerificationTime.value !== null && avgVerificationTime.value > 60) {
    return { level: 'CRITICAL', explanation: 'Massive backlog with high verification latency (> 60m).' };
  }

  // WARNING:
  // - Pending urgent >= 1 OR
  // - Pending high severity >= 3 OR
  // - Pending > 10 and Verification > 30 mins
  if (backlog.pendingUrgentEscalation >= 1) {
    return { level: 'WARNING', explanation: `${backlog.pendingUrgentEscalation} URGENT incident awaiting verification.` };
  }
  if (backlog.pendingHighSeverity >= 3) {
    return { level: 'WARNING', explanation: `${backlog.pendingHighSeverity} high-severity incidents pending.` };
  }
  if (backlog.pending >= 10 && avgVerificationTime.value !== null && avgVerificationTime.value > 30) {
    return { level: 'WARNING', explanation: 'Elevated backlog with slow verification (> 30m).' };
  }

  // WATCH:
  // - Pending > 5
  if (backlog.pending >= 5) {
    return { level: 'WATCH', explanation: 'Moderate workload. Monitor incoming queue.' };
  }

  return { level: 'NORMAL', explanation: 'Manageable workload. No bottlenecks detected.' };
}
