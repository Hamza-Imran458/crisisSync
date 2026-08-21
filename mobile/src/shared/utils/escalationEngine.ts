export type EscalationLevel = 'NONE' | 'MONITOR' | 'REVIEW' | 'URGENT' | 'CRITICAL';

export type EscalationInput = {
  priorityScore: number;
  priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  severity: 'High' | 'Medium' | 'Low' | string;
  isVerified: boolean;
  distanceKm: number | null;
  incidentAgeMinutes: number;
  hasEvidence: boolean;
  similarReportsCount: number;
  currentStatus: string;
};

export type EscalationResult = {
  shouldEscalate: boolean;
  escalationLevel: EscalationLevel;
  escalationReasons: string[];
  recommendedAction: string;
  escalationScore: number;
};

/**
 * Deterministic engine to evaluate whether an incident requires operational escalation.
 * Separates the concept of "Priority" from the actionable "Escalation" response.
 */
export function determineEscalation(input: EscalationInput): EscalationResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Priority Contribution
  if (input.priorityLevel === 'Critical') {
    score += 40;
    reasons.push('Critical system-generated priority');
  } else if (input.priorityLevel === 'High') {
    score += 25;
    reasons.push('High system-generated priority');
  } else if (input.priorityLevel === 'Medium') {
    score += 10;
  }

  // 2. Severity & Verification Integrity
  const isHighSeverity = input.severity === 'High' || input.severity === 'emergency';
  if (isHighSeverity && input.isVerified) {
    score += 30;
    reasons.push('Verified high severity incident');
  } else if (isHighSeverity && !input.isVerified) {
    score += 15;
    reasons.push('High severity incident pending verification');
  }

  // 3. Proximity Threat
  if (input.distanceKm !== null && input.distanceKm <= 1.0) {
    score += 15;
    reasons.push('Immediate proximity (≤ 1km)');
  }

  // 4. Incident Heat (Similar Reports)
  if (input.similarReportsCount >= 3) {
    score += 15;
    reasons.push('Multiple similar reports detected');
  } else if (input.similarReportsCount > 0) {
    score += 5;
    reasons.push('Corroborating reports detected');
  }

  // 5. Evidence
  if (input.hasEvidence && input.isVerified) {
    score += 5;
    reasons.push('Backed by visual evidence');
  }

  // Determine Escalation Thresholds
  let level: EscalationLevel = 'NONE';
  let shouldEscalate = false;
  let action = 'No escalation needed. Routine processing.';

  // High Priority but Unverified -> REVIEW (Prevent automatic CRITICAL on unverified)
  if (score >= 60 && !input.isVerified) {
    level = 'REVIEW';
    shouldEscalate = true;
    action = 'Escalate to senior operator review. Prioritise manual verification immediately.';
  } else if (score >= 80) {
    level = 'CRITICAL';
    shouldEscalate = true;
    action = 'Immediate operator attention required. Consider escalation to emergency response personnel.';
  } else if (score >= 60) {
    level = 'URGENT';
    shouldEscalate = true;
    action = 'Urgent action required. Prioritise response coordination.';
  } else if (score >= 35) {
    level = 'REVIEW';
    shouldEscalate = true;
    action = 'Escalate to operator review to assess potential threat.';
  } else if (score >= 15) {
    level = 'MONITOR';
    shouldEscalate = false;
    action = 'Monitor and assess alongside higher-priority incidents. No immediate escalation.';
  } else {
    level = 'NONE';
    shouldEscalate = false;
    action = 'Record and monitor unless conditions worsen.';
  }

  return {
    shouldEscalate,
    escalationLevel: level,
    escalationReasons: reasons,
    recommendedAction: action,
    escalationScore: score,
  };
}
