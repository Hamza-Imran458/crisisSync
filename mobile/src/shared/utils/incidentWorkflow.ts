import type { AlertItem, Incident } from '../types/app';

export type IncidentReportInput = {
  title: string;
  description: string;
  category: string;
  severity: Incident['severity'];
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm: number;
  status?: Incident['status'];
};

export function validateIncidentInput(input: IncidentReportInput) {
  const errors: string[] = [];

  if (!input.title.trim()) {
    errors.push('Please provide a short incident title.');
  }

  if (input.description.trim().length < 8) {
    errors.push('Please add a bit more detail about the incident.');
  }

  // Category is now an optional classification, UI will default to 'Other' if needed.

  if (!['High', 'Medium', 'Low'].includes(input.severity)) {
    errors.push('Please select a valid severity level.');
  }

  if (!input.location.trim()) {
    errors.push('Please provide a location for the incident.');
  }

  if (input.distanceKm < 0) {
    errors.push('Distance cannot be negative.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getAlertSeverityLabel(severity: AlertItem['severity']) {
  switch (severity) {
    case 'emergency':
      return 'Emergency';
    case 'warning':
      return 'Warning';
    default:
      return 'Information';
  }
}

export function formatRelativeTime(value: string) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return 'Just now';
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - parsed) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays}d ago`;
}

export function isAlertRelevant(
  distanceKm: number | null | undefined,
  userRadiusKm: number | null | undefined
) {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm)) {
    return false;
  }

  if (typeof userRadiusKm !== 'number' || Number.isNaN(userRadiusKm)) {
    return false;
  }

  return distanceKm <= userRadiusKm;
}

export type IncidentWorkflowStatus =
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'RESOLVED';

const incidentTransitions: Record<IncidentWorkflowStatus, IncidentWorkflowStatus[]> = {
  SUBMITTED: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['ACTIVE', 'RESOLVED'],
  REJECTED: [],
  ACTIVE: ['RESOLVED'],
  RESOLVED: [],
};

export function normalizeIncidentStatus(status: string | undefined) {
  switch (status) {
    case 'Pending':
    case 'PENDING_REVIEW':
      return 'PENDING_REVIEW';
    case 'Verified':
    case 'VERIFIED':
      return 'VERIFIED';
    case 'Rejected':
    case 'REJECTED':
      return 'REJECTED';
    case 'Active':
    case 'ACTIVE':
      return 'ACTIVE';
    case 'Resolved':
    case 'RESOLVED':
      return 'RESOLVED';
    case 'Submitted':
    case 'SUBMITTED':
      return 'SUBMITTED';
    default:
      return status;
  }
}

export function canTransitionIncidentStatus(
  currentStatus: string | undefined,
  nextStatus: string | undefined
) {
  if (!currentStatus || !nextStatus) {
    return false;
  }

  const normalizedCurrent = normalizeIncidentStatus(currentStatus);
  const normalizedNext = normalizeIncidentStatus(nextStatus);

  const allowedNext = incidentTransitions[normalizedCurrent as IncidentWorkflowStatus] ?? [];
  return allowedNext.includes(normalizedNext as IncidentWorkflowStatus);
}

export function getUserRoleLabel(role: string | null | undefined) {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'operator':
      return 'Operator';
    default:
      return 'Citizen';
  }
}
