import { supabase } from './supabase';
import { logger } from '../utils/logger';
import type { AuditLog } from '../types/app';

export const auditService = {
  /**
   * Log an incident event to the audit trail
   */
  logIncidentEvent: async (payload: {
    incidentId: string;
    eventType: string;
    previousStatus?: string;
    newStatus?: string;
    note?: string;
  }): Promise<AuditLog | null> => {
    try {
      logger.info('auditService: Logging incident event', payload);
      
      const { data: userData } = await supabase.auth.getUser();
      const actorId = userData?.user?.id;

      const insertData = {
        incident_id: payload.incidentId,
        event_type: payload.eventType,
        previous_status: payload.previousStatus,
        new_status: payload.newStatus,
        actor_id: actorId,
        note: payload.note,
      };

      const { data, error } = await supabase
        .from('incident_audit_logs')
        .insert([insertData])
        .select('*')
        .single();

      if (error) {
        logger.error('auditService: Error inserting audit log', error);
        throw error;
      }

      return {
        id: data.id,
        incidentId: data.incident_id,
        eventType: data.event_type,
        previousStatus: data.previous_status,
        newStatus: data.new_status,
        actorId: data.actor_id,
        note: data.note,
        createdAt: data.created_at,
      };
    } catch (err) {
      logger.error('auditService: logIncidentEvent failed', err);
      return null;
    }
  },

  /**
   * Fetch audit logs for a specific incident
   */
  fetchIncidentAuditLogs: async (incidentId: string): Promise<AuditLog[]> => {
    try {
      logger.info('auditService: Fetching audit logs for incident', incidentId);
      
      const { data, error } = await supabase
        .from('incident_audit_logs')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('auditService: Error fetching audit logs', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        incidentId: row.incident_id,
        eventType: row.event_type,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        actorId: row.actor_id,
        note: row.note,
        createdAt: row.created_at,
      }));
    } catch (err) {
      logger.error('auditService: fetchIncidentAuditLogs failed', err);
      return [];
    }
  }
};
