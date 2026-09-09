import { saveIncident, updateIncident, getCurrentSession } from './supabase';
import type { Incident } from '../types/app';
import { validateIncidentInput, type IncidentReportInput, canTransitionIncidentStatus } from '../utils/incidentWorkflow';
import { auditService } from './auditService';
import { logger } from '../utils/logger';

export async function submitIncident(input: IncidentReportInput) {
  const validation = validateIncidentInput(input);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  // Attach user_id when the reporter is authenticated; allow anonymous reports
  const session = await getCurrentSession();

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    severity: input.severity,
    location: input.location.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    distance_km: input.distanceKm,
    status: input.status === 'Pending' ? 'PENDING_REVIEW' : input.status ?? 'PENDING_REVIEW',
  };

  if (session?.user?.id) {
    payload.user_id = session.user.id;
  }

  const savedIncidents = await saveIncident(payload);
  const newIncident = savedIncidents[0] as Incident;
  
  await auditService.logIncidentEvent({
    incidentId: newIncident.id,
    eventType: 'Incident Reported',
    newStatus: newIncident.status,
  });

  return newIncident;
}

export async function changeIncidentStatus(
  incidentId: string,
  currentStatus: string,
  newStatus: string,
  reason?: string
) {
  if (!canTransitionIncidentStatus(currentStatus, newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  logger.info(`Changing incident ${incidentId} status to ${newStatus}`);
  
  const updatedIncident = await updateIncident(incidentId, { status: newStatus });

  await auditService.logIncidentEvent({
    incidentId,
    eventType: 'Status Changed',
    previousStatus: currentStatus,
    newStatus,
    note: reason,
  });

  return updatedIncident;
}

export async function verifyIncidentWorkflow(incidentId: string, currentStatus: string = 'Pending') {
  const updatedIncident = await changeIncidentStatus(incidentId, currentStatus, 'Verified');

  await auditService.logIncidentEvent({
    incidentId,
    eventType: 'INCIDENT_VERIFIED',
    previousStatus: currentStatus,
    newStatus: 'Verified',
    note: 'Verified by administrator',
  });

  return updatedIncident;
}

export async function rejectIncidentWorkflow(incidentId: string, reason: string, currentStatus: string = 'Pending') {
  if (!reason?.trim()) {
    throw new Error('A reason is required to reject an incident.');
  }

  const updatedIncident = await changeIncidentStatus(incidentId, currentStatus, 'Rejected', reason);

  await auditService.logIncidentEvent({
    incidentId,
    eventType: 'INCIDENT_REJECTED',
    previousStatus: currentStatus,
    newStatus: 'Rejected',
    note: `Rejected by administrator: ${reason.trim()}`,
  });

  return updatedIncident;
}

export async function resolveIncidentWorkflow(incidentId: string, currentStatus: string = 'Verified') {
  return changeIncidentStatus(incidentId, currentStatus, 'Resolved');
}

export async function escalateIncidentWorkflow(incidentId: string, reason: string, currentStatus: string = 'Verified') {
  if (!reason?.trim()) {
    throw new Error('A reason is required to escalate an incident.');
  }

  const updatedIncident = await changeIncidentStatus(incidentId, currentStatus, 'Active', reason);

  await auditService.logIncidentEvent({
    incidentId,
    eventType: 'INCIDENT_ESCALATED',
    previousStatus: currentStatus,
    newStatus: 'Active',
    note: `Escalated by administrator: ${reason.trim()}`,
  });

  return updatedIncident;
}

/**
 * Fetches all incidents reported by the currently authenticated user.
 * Relies on Supabase RLS allowing users to SELECT rows where user_id = auth.uid().
 */
export async function fetchMyIncidents(): Promise<Incident[]> {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return [];
  }

  const { supabase: sb } = await import('./supabase');
  const { normalizeIncident } = await import('./supabase');

  const { data, error } = await sb
    .from('incidents')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('fetchMyIncidents: failed to fetch', error);
    return [];
  }

  return (data || []).map(normalizeIncident);
}