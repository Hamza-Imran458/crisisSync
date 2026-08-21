import { supabase } from './supabase';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { logger } from '../utils/logger';
import type { ResponseRecord, ResponseStatus } from '../types/app';

function formatSupabaseError(error: unknown): Error {
  if (!error || typeof error !== 'object') {
    return new Error('Unable to dispatch response.');
  }

  const supabaseError = error as {
    code?: string;
    message?: string;
    details?: string | null;
    hint?: string | null;
  };

  const message = supabaseError.message || 'Unable to dispatch response.';
  const detail = supabaseError.details || null;
  const hint = supabaseError.hint || null;
  const code = supabaseError.code || 'UNKNOWN_ERROR';

  logger.error('responseService: Supabase error', {
    code,
    message,
    details: detail,
    hint,
  });

  if (code === '42501') {
    return new Error('Response creation is blocked by the current Supabase permissions policy. Please contact the backend administrator to configure the responses RLS policy.');
  }

  if (detail || hint) {
    return new Error(`${message}${detail ? ` (${detail})` : ''}`);
  }

  return new Error(message);
}

export type DispatchResponseInput = {
  incidentId: string;
  assignedTo: string;
  notes?: string;
};

const RESPONSE_TRANSITIONS: Record<ResponseStatus, ResponseStatus[]> = {
  Dispatched: ['Acknowledged', 'Cancelled'],
  Acknowledged: ['On Scene', 'Cancelled'],
  'On Scene': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

function normalizeResponse(row: any): ResponseRecord {
  return {
    id: row.id,
    incidentId: row.incident_id,
    assignedTo: row.assigned_to ?? null,
    status: (row.status as ResponseStatus) ?? 'Dispatched',
    notes: row.notes ?? row.note ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function canTransitionResponseStatus(current: ResponseStatus, next: ResponseStatus): boolean {
  return RESPONSE_TRANSITIONS[current]?.includes(next) ?? false;
}

async function getCurrentUserProfile(): Promise<{ userId: string; role: string; isAdmin: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Unable to resolve current user: ${userError.message}`);
  }

  const userId = userData?.user?.id;

  if (!userId) {
    throw new Error('Authentication required.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load profile authorization: ${error.message}`);
  }

  const role = (data?.role ?? 'citizen') as string;
  const isAdmin = Boolean(data?.is_admin) || role === 'admin';

  return { userId, role, isAdmin };
}

async function ensureAuthorizedForResponseAction(action: string, requireAdmin: boolean = false) {
  const { isAdmin, role, userId } = await getCurrentUserProfile();

  if (requireAdmin && !isAdmin) {
    throw new Error(`Authorization required: only admins can ${action}.`);
  }

  if (!requireAdmin && role !== 'operator' && !isAdmin) {
    throw new Error(`Authorization required: only operators can ${action}.`);
  }

  return { isAdmin, role, userId };
}

export const responseService = {
  dispatchResponse: async (input: DispatchResponseInput): Promise<ResponseRecord> => {
    if (!input.incidentId?.trim()) {
      throw new Error('Incident ID is required.');
    }

    if (!input.assignedTo?.trim()) {
      throw new Error('An assigned operator is required.');
    }

    const { isAdmin } = await ensureAuthorizedForResponseAction('dispatch responses', true);

    if (!isAdmin) {
      throw new Error('Authorization required: only admin users can dispatch responses.');
    }

    const responsePayload = {
      incident_id: input.incidentId,
      assigned_to: input.assignedTo,
      status: 'Dispatched',
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('responses')
      .insert([responsePayload])
      .select('*')
      .single();

    if (error) {
      throw formatSupabaseError(error);
    }

    const { data: incidentData } = await supabase
      .from('incidents')
      .select('title, severity, location')
      .eq('id', input.incidentId)
      .maybeSingle();

    const { data: operatorData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', input.assignedTo)
      .maybeSingle();

    await auditService.logIncidentEvent({
      incidentId: input.incidentId,
      eventType: 'RESPONSE_DISPATCHED',
      newStatus: 'Dispatched',
      note: input.notes?.trim() || 'Response dispatched by admin',
    });

    try {
      await notificationService.notifyResponseDispatch({
        incidentId: input.incidentId,
        responseId: data.id,
        incidentTitle: incidentData?.title || 'Incident',
        severity: incidentData?.severity || 'Unknown',
        location: incidentData?.location || undefined,
        operatorName: operatorData?.full_name || operatorData?.email || 'Assigned operator',
      });
    } catch (notificationError) {
      logger.warn('responseService: response notification failed', notificationError);
    }

    return normalizeResponse(data);
  },

  fetchResponseForIncident: async (incidentId: string): Promise<ResponseRecord | null> => {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('responseService: fetchResponseForIncident failed', error);
      throw new Error(error.message || 'Unable to load response.');
    }

    return data ? normalizeResponse(data) : null;
  },

  fetchResponsesForUser: async (): Promise<ResponseRecord[]> => {
    const { userId, isAdmin } = await ensureAuthorizedForResponseAction('view responses');

    let query = supabase.from('responses').select('*').order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('responseService: fetchResponsesForUser failed', error);
      throw new Error(error.message || 'Unable to load assigned responses.');
    }

    return (data || []).map(normalizeResponse);
  },

  ackResponse: async (responseId: string, note?: string): Promise<ResponseRecord> => {
    if (!responseId?.trim()) {
      throw new Error('Response ID is required.');
    }

    const { userId, isAdmin } = await ensureAuthorizedForResponseAction('acknowledge responses');

    const { data: responseRow, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('id', responseId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message || 'Unable to load response.');
    }

    if (!responseRow) {
      throw new Error('Response not found.');
    }

    if (!isAdmin && responseRow.assigned_to !== userId) {
      throw new Error('This response is not assigned to you.');
    }

    if (!canTransitionResponseStatus(responseRow.status, 'Acknowledged')) {
      throw new Error(`Invalid response status transition from ${responseRow.status} to Acknowledged.`);
    }

    const updatedNotes = note?.trim() || responseRow.notes || null;

    const { data, error } = await supabase
      .from('responses')
      .update({
        status: 'Acknowledged',
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select('*')
      .single();

    if (error) {
      logger.error('responseService: ackResponse failed', error);
      throw new Error(error.message || 'Unable to acknowledge response.');
    }

    await auditService.logIncidentEvent({
      incidentId: responseRow.incident_id,
      eventType: 'RESPONSE_ACK',
      previousStatus: responseRow.status,
      newStatus: 'Acknowledged',
      note: updatedNotes || 'Operator acknowledged the response',
    });

    return normalizeResponse(data);
  },

  markResponseOnScene: async (responseId: string, note?: string): Promise<ResponseRecord> => {
    if (!responseId?.trim()) {
      throw new Error('Response ID is required.');
    }

    const { userId, isAdmin } = await ensureAuthorizedForResponseAction('mark responses on scene');

    const { data: responseRow, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('id', responseId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message || 'Unable to load response.');
    }

    if (!responseRow) {
      throw new Error('Response not found.');
    }

    if (!isAdmin && responseRow.assigned_to !== userId) {
      throw new Error('This response is not assigned to you.');
    }

    if (!canTransitionResponseStatus(responseRow.status, 'On Scene')) {
      throw new Error(`Invalid response status transition from ${responseRow.status} to On Scene.`);
    }

    const updatedNotes = note?.trim() || responseRow.notes || null;

    const { data, error } = await supabase
      .from('responses')
      .update({
        status: 'On Scene',
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select('*')
      .single();

    if (error) {
      logger.error('responseService: markResponseOnScene failed', error);
      throw new Error(error.message || 'Unable to update response state.');
    }

    await auditService.logIncidentEvent({
      incidentId: responseRow.incident_id,
      eventType: 'RESPONSE_ON_SCENE',
      previousStatus: responseRow.status,
      newStatus: 'On Scene',
      note: updatedNotes || 'Operator marked the response as on scene',
    });

    return normalizeResponse(data);
  },

  completeResponse: async (responseId: string, note?: string): Promise<ResponseRecord> => {
    if (!responseId?.trim()) {
      throw new Error('Response ID is required.');
    }

    const { userId, isAdmin } = await ensureAuthorizedForResponseAction('complete responses');

    const { data: responseRow, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('id', responseId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message || 'Unable to load response.');
    }

    if (!responseRow) {
      throw new Error('Response not found.');
    }

    if (!isAdmin && responseRow.assigned_to !== userId) {
      throw new Error('This response is not assigned to you.');
    }

    if (!canTransitionResponseStatus(responseRow.status, 'Completed')) {
      throw new Error(`Invalid response status transition from ${responseRow.status} to Completed.`);
    }

    const updatedNotes = note?.trim() || responseRow.notes || null;

    const { data, error } = await supabase
      .from('responses')
      .update({
        status: 'Completed',
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select('*')
      .single();

    if (error) {
      logger.error('responseService: completeResponse failed', error);
      throw new Error(error.message || 'Unable to complete response.');
    }

    await auditService.logIncidentEvent({
      incidentId: responseRow.incident_id,
      eventType: 'RESPONSE_COMPLETED',
      previousStatus: responseRow.status,
      newStatus: 'Completed',
      note: updatedNotes || 'Operator completed the response',
    });

    return normalizeResponse(data);
  },

  cancelResponse: async (responseId: string, note?: string): Promise<ResponseRecord> => {
    if (!responseId?.trim()) {
      throw new Error('Response ID is required.');
    }

    const { isAdmin } = await ensureAuthorizedForResponseAction('cancel responses', true);

    const { data: responseRow, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('id', responseId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message || 'Unable to load response.');
    }

    if (!responseRow) {
      throw new Error('Response not found.');
    }

    if (responseRow.status === 'Completed' || responseRow.status === 'Cancelled') {
      throw new Error(`Invalid response status transition from ${responseRow.status} to Cancelled.`);
    }

    const updatedNotes = note?.trim() || responseRow.notes || null;

    const { data, error } = await supabase
      .from('responses')
      .update({
        status: 'Cancelled',
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select('*')
      .single();

    if (error) {
      logger.error('responseService: cancelResponse failed', error);
      throw new Error(error.message || 'Unable to cancel response.');
    }

    await auditService.logIncidentEvent({
      incidentId: responseRow.incident_id,
      eventType: 'RESPONSE_CANCELLED',
      previousStatus: responseRow.status,
      newStatus: 'Cancelled',
      note: updatedNotes || 'Response cancelled by admin',
    });

    return normalizeResponse(data);
  },
};
