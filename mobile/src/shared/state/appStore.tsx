import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { Session } from '@supabase/supabase-js';
import type { AlertItem, Incident, Profile } from '../types/app';

import {
  supabase,
  fetchAlertsFromDb,
  fetchIncidentsFromDb,
  subscribeToAlerts,
} from '../services/supabase';

import { getUserRole, signOutUser } from '../services/authService';
import { profileService } from '../services/profileService';
import { fetchMyIncidents } from '../services/incidentService';

const defaultProfile: Profile = {
  name: '',
  email: '',
  notificationRadiusKm: 3,
  alertsEnabled: true,
  smsBackupEnabled: false,
};

type AppStoreContextValue = {
  // Auth state
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  authLoading: boolean;

  // Data state
  incidents: Incident[];
  myIncidents: Incident[];
  alerts: AlertItem[];
  alertsLoading: boolean;
  alertsError: string | null;
  profile: Profile;
  profileLoading: boolean;

  // Actions
  addIncident: (incident: Incident) => void;
  addAlert: (alert: AlertItem) => void;
  setProfile: (profile: Profile) => void;
  signOut: () => Promise<void>;
};

const AppStoreContext =
  createContext<AppStoreContextValue | undefined>(undefined);

export function AppStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ============================================
  // AUTH STATE
  // ============================================

  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ============================================
  // DATA STATE
  // ============================================

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [profileLoading, setProfileLoading] = useState(false);

  console.log('[DEBUG] AppStoreProvider mounted');

  React.useEffect(() => {
    console.log('[DEBUG] AppStoreProvider effect started');

    let mounted = true;

    // ============================================
    // LOAD INCIDENTS
    // ============================================

    async function loadIncidents() {
      console.log('📥 AppStore: Fetching incidents...');

      try {
        const incidentData = await fetchIncidentsFromDb();

        if (mounted) {
          setIncidents(incidentData);

          console.log(
            '✅ AppStore incidents state updated:',
            incidentData.length
          );
        }
      } catch (error) {
        console.log('❌ AppStore incident load error:', error);
      }
    }

    // ============================================
    // LOAD ALERTS
    // ============================================

    async function loadAlerts() {
      console.log('📥 AppStore: Fetching alerts...');

      if (mounted) {
        setAlertsLoading(true);
        setAlertsError(null);
      }

      try {
        const alertData = await fetchAlertsFromDb();

        if (mounted) {
          setAlerts(alertData);

          console.log(
            '✅ AppStore alerts state updated:',
            alertData.length
          );
        }
      } catch (error: any) {
        console.log('❌ AppStore alert load error:', error);

        if (mounted) {
          setAlertsError(
            error?.message ?? 'Unable to load alerts.'
          );
        }
      } finally {
        if (mounted) {
          setAlertsLoading(false);
        }
      }
    }

    // ============================================
    // LOAD USER ROLE
    // ============================================

    async function loadUserRole() {
      try {
        const role = await getUserRole();
        if (mounted) {
          const normalizedRole = role ?? 'citizen';
          setUserRole(normalizedRole);
          setIsAdmin(normalizedRole === 'admin' || normalizedRole === 'operator' || Boolean(profile?.role === 'admin'));
          console.log('👤 AppStore user role loaded:', normalizedRole);
        }
      } catch (error) {
        console.log('❌ AppStore role load error:', error);
        if (mounted) {
          setUserRole('citizen');
          setIsAdmin(false);
        }
      }
    }

    async function loadProfile() {
      try {
        if (mounted) setProfileLoading(true);
        const fetchedProfile = await profileService.fetchUserProfile();
        if (mounted && fetchedProfile) {
          setProfile(fetchedProfile);
          console.log('👤 AppStore profile loaded:', fetchedProfile.name);
        }
      } catch (error) {
        console.log('❌ AppStore profile load error:', error);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    async function loadMyIncidents() {
      try {
        const mine = await fetchMyIncidents();
        if (mounted) {
          setMyIncidents(mine);
          console.log('📋 AppStore my incidents loaded:', mine.length);
        }
      } catch (error) {
        console.log('❌ AppStore my incidents load error:', error);
      }
    }

    // ============================================
    // INITIAL DATA LOAD
    // ============================================

    async function loadInitialData() {
      console.log('🚀 AppStore initial data loading...');

      await loadIncidents();

      // Check whether a user is already authenticated.
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      console.log(
        '🔐 AppStore initial session:',
        currentSession ? 'USER LOGGED IN' : 'NO USER'
      );

      if (mounted) {
        setSession(currentSession);
      }

      if (currentSession) {
        await Promise.all([
          loadAlerts(),
          loadUserRole(),
          loadProfile(),
          loadMyIncidents(),
        ]);
      } else {
        console.log(
          '⏳ No authenticated user yet. Alerts will load after login.'
        );
      }

      // Auth state is now known — release loading gate
      if (mounted) {
        setAuthLoading(false);
      }
    }

    let alertChannel: any = null;

    function startAlertSubscription() {
      if (alertChannel) {
        console.log(
          '⚠️ Alert subscription already active.'
        );
        return;
      }

      alertChannel = subscribeToAlerts(
        'app-alerts-channel',

        // NEW ALERT
        (newAlert) => {
          console.log(
            '🆕 AppStore received NEW alert:',
            newAlert
          );

          setAlerts((current) => {
            const exists = current.some(
              (alert) => alert.id === newAlert.id
            );

            if (exists) {
              return current.map((alert) =>
                alert.id === newAlert.id
                  ? newAlert
                  : alert
              );
            }

            return [newAlert, ...current];
          });
        },

        // UPDATED ALERT
        (updatedAlert) => {
          console.log(
            '🔄 AppStore received UPDATED alert:',
            updatedAlert
          );

          setAlerts((current) =>
            current.map((alert) =>
              alert.id === updatedAlert.id
                ? updatedAlert
                : alert
            )
          );
        },

        // DELETED ALERT
        (deletedAlert) => {
          console.log(
            '🗑️ AppStore received DELETED alert:',
            deletedAlert
          );

          setAlerts((current) =>
            current.filter(
              (alert) => alert.id !== deletedAlert.id
            )
          );
        }
      );
    }

    function stopAlertSubscription() {
      if (!alertChannel) {
        return;
      }

      console.log('🛑 Stopping alert subscription');
      supabase.removeChannel(alertChannel);
      alertChannel = null;
    }

    // ============================================
    // AUTH STATE LISTENER
    // ============================================

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('🔐 AUTH STATE CHANGED:', event);

      if (event === 'SIGNED_IN' && newSession) {
        console.log(
          '✅ User signed in. Loading alerts now...'
        );

        if (mounted) {
          setSession(newSession);
        }

        // Don't perform Supabase queries directly inside
        // the auth callback.
        setTimeout(() => {
          if (mounted) {
            loadAlerts();
            loadUserRole();
            loadProfile();
            loadMyIncidents();
            startAlertSubscription();
          }
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        console.log(
          '🚪 User signed out. Clearing state.'
        );

        if (mounted) {
          setSession(null);
          setUserRole(null);
          setIsAdmin(false);
          setAlerts([]);
          setMyIncidents([]);
          setProfile(defaultProfile);
          stopAlertSubscription();
        }
      }

      if (event === 'TOKEN_REFRESHED' && newSession) {
        if (mounted) {
          setSession(newSession);
        }
      }
    });

    // ============================================
    // ALERT REALTIME SUBSCRIPTION
    // ============================================

    async function initializeAlertsForSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession) {
        startAlertSubscription();
      }
    }

    loadInitialData();
    initializeAlertsForSession();

    // ============================================
    // CLEANUP
    // ============================================

    return () => {
      console.log(
        '🧹 AppStoreProvider cleanup'
      );

      mounted = false;

      authSubscription.unsubscribe();
      stopAlertSubscription();
    };
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const signOut = React.useCallback(async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.log('❌ AppStore sign out error:', error);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      // Auth
      session,
      userRole,
      isAdmin,
      authLoading,

      // Data
      incidents,
      myIncidents,
      alerts,
      profile,
      profileLoading,
      alertsLoading,
      alertsError,

      addIncident: (incident: Incident) => {
        setIncidents((prev) => [incident, ...prev]);
        setMyIncidents((prev) => [incident, ...prev]);
      },

      addAlert: (alert: AlertItem) =>
        setAlerts((prev) => [alert, ...prev]),

      setProfile: (p: Profile) => setProfile(p),

      signOut,
    }),
    [session, userRole, isAdmin, authLoading, incidents, myIncidents, alerts, profile, profileLoading, alertsLoading, alertsError, signOut]
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error(
      'useAppStore must be used inside AppStoreProvider'
    );
  }

  return context;
}