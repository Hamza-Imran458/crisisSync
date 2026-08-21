import { supabase, getCurrentSession } from './supabase';
import type { Profile } from '../types/app';
import { logger } from '../utils/logger';

/**
 * Normalizes snake_case database row to camelCase Profile type.
 */
function normalizeProfile(data: any): Profile {
  return {
    name: data.full_name ?? data.name ?? 'Citizen',
    email: data.email ?? '',
    notificationRadiusKm: data.notification_radius_km ?? 3,
    alertsEnabled: data.alerts_enabled ?? true,
    smsBackupEnabled: data.sms_backup_enabled ?? false,
  };
}

export const profileService = {
  /**
   * Fetches the profile for the currently authenticated user.
   */
  async fetchUserProfile(): Promise<Profile | null> {
    try {
      const session = await getCurrentSession();
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Make sure email is populated from auth if missing in profile table
      data.email = data.email || session.user.email;

      return normalizeProfile(data);
    } catch (error) {
      logger.error('Failed to fetch user profile:', error);
      return null;
    }
  },

  /**
   * Updates the authenticated user's profile.
   */
  async updateUserProfile(updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const session = await getCurrentSession();
      if (!session?.user?.id) throw new Error('No authenticated user');

      const dbPayload: any = { updated_at: new Date().toISOString() };
      
      if (updates.name !== undefined) dbPayload.full_name = updates.name;
      if (updates.notificationRadiusKm !== undefined) dbPayload.notification_radius_km = updates.notificationRadiusKm;
      if (updates.alertsEnabled !== undefined) dbPayload.alerts_enabled = updates.alertsEnabled;
      if (updates.smsBackupEnabled !== undefined) dbPayload.sms_backup_enabled = updates.smsBackupEnabled;

      const { data, error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('id', session.user.id)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Profile update returned no data');

      data.email = data.email || session.user.email;
      return normalizeProfile(data);
    } catch (error) {
      logger.error('Failed to update user profile:', error);
      throw error;
    }
  }
};
