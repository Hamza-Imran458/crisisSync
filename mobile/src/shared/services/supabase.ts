
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { AlertItem, Incident, ResponseRecord } from '../types/app';
import { IncidentReportInput, validateIncidentInput } from '../utils/incidentWorkflow';

const safeAsyncStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
  clear: async () => undefined,
};

const sessionStorage = typeof window !== 'undefined' ? AsyncStorage : safeAsyncStorage;

// ==========================================================================
// SUPABASE CONFIGURATION
// ==========================================================================

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.warn(
    'EXPO_PUBLIC_SUPABASE_URL is missing from .env; using a safe placeholder for local tests.'
  );
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing from .env; using a safe placeholder for local tests.'
  );
}

// ==========================================================================
// SUPABASE CLIENT
// ==========================================================================

export const supabase: SupabaseClient =
  createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },

      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

// ==========================================================================
// AUTH
// ==========================================================================

export async function signUp(
  email: string,
  password: string
) {
  const cleanEmail = email.trim();

  if (!cleanEmail || !password) {
    throw new Error(
      'Email and password are required.'
    );
  }

  const { data, error } =
    await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

// --------------------------------------------------------------------------

export async function signIn(
  email: string,
  password: string
) {
  const cleanEmail = email.trim();

  if (!cleanEmail || !password) {
    throw new Error(
      'Email and password are required.'
    );
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

// --------------------------------------------------------------------------

export async function logOut() {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

// --------------------------------------------------------------------------

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

// --------------------------------------------------------------------------

export async function getCurrentSession() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

// ==========================================================================
// INCIDENTS
// ==========================================================================

// --------------------------------------------------------------------------
// SAVE INCIDENT
// --------------------------------------------------------------------------

export async function submitIncident(input: IncidentReportInput) {
  const validation = validateIncidentInput(input);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  // Get currently logged-in user
  const session = await getCurrentSession();

  // Attach user_id when a user is authenticated; allow anonymous reports otherwise
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    severity: input.severity,
    location: input.location.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    distance_km: input.distanceKm,
    status: input.status ?? 'Pending',
  };

  if (session?.user?.id) {
    // Only set when available to avoid overwriting with null
    (payload as any).user_id = session.user.id;
  }

  const savedIncidents = await saveIncident(payload);
  const newIncident = savedIncidents[0] as Incident;

  // Avoid circular import at module init time by dynamically importing auditService
  try {
    const { auditService } = await import('./auditService');
    if (auditService?.logIncidentEvent) {
      await auditService.logIncidentEvent({
        incidentId: newIncident.id,
        eventType: 'Incident Reported',
        newStatus: newIncident.status,
      });
    }
  } catch (err) {
    console.warn('supabase: auditService unavailable while logging incident event', err);
  }

  return newIncident;
}

// --------------------------------------------------------------------------
// NORMALIZE INCIDENT
// --------------------------------------------------------------------------

export function normalizeIncident(
  incident: any
): Incident {
  const distanceKm =
    incident.distanceKm ??
    incident.distance_km ??
    0;

  const createdAt =
    incident.createdAt ??
    incident.created_at ??
    '';

  return {
    id: incident.id,
    title: incident.title,
    description: incident.description,
    category: incident.category,
    severity: incident.severity as Incident['severity'],
    location: incident.location,
    latitude: typeof incident.latitude === 'number' ? incident.latitude : incident.latitude ? Number(incident.latitude) : null,
    longitude: typeof incident.longitude === 'number' ? incident.longitude : incident.longitude ? Number(incident.longitude) : null,
    distanceKm:
      typeof distanceKm === 'number'
        ? distanceKm
        : Number(distanceKm) || 0,
    createdAt:
      typeof createdAt === 'string'
        ? createdAt
        : String(createdAt),
    status: incident.status as Incident['status'],
    reporterId:
  incident.user_id ??
  incident.userId ??
  undefined,
  };
}

// --------------------------------------------------------------------------
// FETCH INCIDENTS
// --------------------------------------------------------------------------

export async function fetchIncidentsFromDb() {
  const { data, error } =
    await supabase
      .from('incidents')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeIncident);
}

// --------------------------------------------------------------------------
// FETCH ALERTS
// --------------------------------------------------------------------------

export async function fetchAlertsFromDb() {
  const { data, error } =
    await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeAlert);
}

// --------------------------------------------------------------------------
// NORMALIZE ALERT
// --------------------------------------------------------------------------

export function normalizeAlert(alert: any): AlertItem {
  const createdAt = alert.createdAt ?? alert.created_at ?? '';

  return {
    id: alert.id,
    title: alert.title,
    body: alert.body,
    severity:
      alert.severity === 'warning' ||
      alert.severity === 'emergency' ||
      alert.severity === 'info'
        ? alert.severity
        : 'info',
    createdAt:
      typeof createdAt === 'string'
        ? createdAt
        : String(createdAt),
  };
}

export function normalizeResponseRecord(row: any): ResponseRecord {
  return {
    id: row.id,
    incidentId: row.incident_id,
    assignedTo: row.assigned_to ?? null,
    status: row.status ?? 'Dispatched',
    notes: row.notes ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

export async function fetchResponsesForIncident(incidentId: string): Promise<ResponseRecord[]> {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row: any) => normalizeResponseRecord(row));
}

export async function fetchEligibleOperators(): Promise<Array<{id: string; name: string; email?: string}>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or('role.eq.operator,is_admin.eq.true')
    .order('full_name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((profile: any) => ({
    id: profile.id,
    name: profile.full_name || profile.name || profile.email || 'Operator',
    email: profile.email || undefined,
  }));
}

// --------------------------------------------------------------------------
// SUBSCRIBE ALERTS
// --------------------------------------------------------------------------

export function subscribeToAlerts(
  channelName: string,
  onInsert: (alert: AlertItem) => void,
  onUpdate?: (alert: AlertItem) => void,
  onDelete?: (alert: AlertItem) => void
) {
  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
    },
    (payload) => {
      onInsert(normalizeAlert(payload.new));
    }
  );

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'alerts',
    },
    (payload) => {
      if (onUpdate) {
        onUpdate(normalizeAlert(payload.new));
      }
    }
  );

  channel.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'alerts',
    },
    (payload) => {
      if (onDelete) {
        onDelete(normalizeAlert(payload.old));
      }
    }
  );

  channel.subscribe();

  return channel;
}

// --------------------------------------------------------------------------
// UPDATE INCIDENT
// --------------------------------------------------------------------------

export async function updateIncident(
  id: string,
  updates: Record<string, unknown>
) {
  if (!id) {
    throw new Error(
      'Incident ID is required.'
    );
  }

  // Always update updated_at
  const finalUpdates = {
    ...updates,
    updated_at:
      new Date().toISOString(),
  };

  const {
    data,
    error,
  } = await supabase
    .from('incidents')
    .update(finalUpdates)
    .eq('id', id)
    .select('*');

  // --------------------------------------------------
  // SUPABASE ERROR
  // --------------------------------------------------

  if (error) {
    throw error;
  }

  // --------------------------------------------------
  // ZERO ROWS UPDATED
  // --------------------------------------------------

  if (!data || data.length === 0) {
    throw new Error(
      'Incident could not be updated. Check Supabase UPDATE permissions/RLS policies.'
    );
  }

  // --------------------------------------------------
  // SUCCESS
  // --------------------------------------------------

  return normalizeIncident(data[0]);
}

// --------------------------------------------------------------------------
// DELETE INCIDENT
// --------------------------------------------------------------------------

export async function deleteIncident(
  id: string
) {
  const { data, error } =
    await supabase
      .from('incidents')
      .delete()
      .eq('id', id)
      .select('*');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Incident could not be deleted. Check Supabase DELETE permissions/RLS policies.'
    );
  }

  return data[0];
}

// ==========================================================================
// REALTIME
// ==========================================================================

export function subscribeToResponses(
  channelName: string,
  onInsert: (response: ResponseRecord) => void,
  onUpdate?: (response: ResponseRecord) => void,
  onDelete?: (response: ResponseRecord) => void
) {
  const channel = supabase.channel(channelName);

  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, (payload) => {
    onInsert(normalizeResponseRecord(payload.new));
  });

  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'responses' }, (payload) => {
    if (onUpdate) {
      onUpdate(normalizeResponseRecord(payload.new));
    }
  });

  channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'responses' }, (payload) => {
    if (onDelete) {
      onDelete(normalizeResponseRecord(payload.old));
    }
  });

  channel.subscribe();

  return channel;
}

export function subscribeToIncidents(
  channelName: string,
  onInsert: (incident: Incident) => void,
  onUpdate?: (incident: Incident) => void,
  onDelete?: (incident: Incident) => void
) {
  const channel =
    supabase.channel(channelName);

  // ------------------------------------------------------------------------
  // INSERT
  // ------------------------------------------------------------------------

  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'incidents',
    },
    payload => {
      onInsert(normalizeIncident(payload.new));
    }
  );

  // ------------------------------------------------------------------------
  // UPDATE
  // ------------------------------------------------------------------------

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'incidents',
    },
    payload => {
      if (onUpdate) {
        onUpdate(normalizeIncident(payload.new));
      }
    }
  );

  // ------------------------------------------------------------------------
  // DELETE
  // ------------------------------------------------------------------------

  channel.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'incidents',
    },
    payload => {
      if (onDelete) {
        onDelete(normalizeIncident(payload.old));
      }
    }
  );

  // ------------------------------------------------------------------------
  // SUBSCRIBE
  // ------------------------------------------------------------------------

  channel.subscribe();

  return channel;
}

// --------------------------------------------------------------------------
// SAVE INCIDENT (DB)
// --------------------------------------------------------------------------

export async function saveIncident(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('incidents')
    .insert([payload])
    .select('*');

  if (error) {
    throw error;
  }

  return data || [];
}
