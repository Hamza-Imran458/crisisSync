import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncidentCard } from '../../../shared/components/ui/IncidentCard';
import { SectionHeader } from '../../../shared/components/ui/SectionHeader';
import { theme } from '../../../shared/theme/theme';

import {
  fetchIncidentsFromDb,
  subscribeToIncidents,
  supabase,
} from '../../../shared/services/supabase';
import { enrichIncidentWithLocation, getUserLocationForApp } from '../../../shared/services/incidentIntelligenceService';
import { useAppStore } from '../../../shared/state/appStore';
import { normalizeIncidentStatus } from '../../../shared/utils/incidentWorkflow';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/types';
import { notificationService } from '../../../shared/services/notificationService';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAppStore();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationState, setLocationState] = useState<'loading' | 'available' | 'denied' | 'unavailable'>('loading');

  /**
   * Load only VERIFIED incidents from Supabase
   */
  async function loadIncidents() {
    try {
      const data = await fetchIncidentsFromDb();
      const location = await getUserLocationForApp();

      if (location.latitude != null && location.longitude != null) {
        setLocationState('available');
      } else if (location.permissionDenied) {
        setLocationState('denied');
      } else {
        setLocationState('unavailable');
      }

      const verifiedIncidents = (data || []).filter((incident: any) => {
        const normalizedStatus = normalizeIncidentStatus(incident.status as string | undefined);
        return normalizedStatus === 'VERIFIED' || normalizedStatus === 'ACTIVE';
      });

      const enrichedIncidents = await Promise.all(
        verifiedIncidents.map(async (incident) => {
          const intelligence = await enrichIncidentWithLocation(
            incident,
            location.latitude ?? undefined,
            location.longitude ?? undefined,
            profile.notificationRadiusKm
          );

          return {
            ...incident,
            ...intelligence,
          };
        })
      );

      const sortedIncidents = enrichedIncidents.sort((a, b) => {
        if ((b.priorityScore ?? 0) !== (a.priorityScore ?? 0)) {
          return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        }

        if ((b.distanceKm ?? Number.POSITIVE_INFINITY) !== (a.distanceKm ?? Number.POSITIVE_INFINITY)) {
          return (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
        }

        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });

      setIncidents(sortedIncidents);
    } catch (error) {
      setLocationState('unavailable');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();

    const channel = subscribeToIncidents(

      'home-incidents-channel',

      /**
       * INSERT
       *
       * New incident has been created.
       */
      (newIncident) => {
        const normalizedStatus = normalizeIncidentStatus(newIncident.status as string | undefined);
        if (normalizedStatus !== 'VERIFIED' && normalizedStatus !== 'ACTIVE') {
          return;
        }

        setIncidents((current) => {
          const exists = current.some(
            (incident) =>
              incident.id === newIncident.id
          );

          if (exists) {
            return current;
          }

          if (newIncident.severity === 'High') {
            notificationService.sendLocalPush({
              title: 'Critical Crisis Alert',
              body: `New ${newIncident.category || 'emergency'} incident reported: ${newIncident.title || 'Please check the app.'}`,
              data: { incidentId: newIncident.id },
            });
          }

          return [
            newIncident,
            ...current,
          ];
        });
      },

      /**
       * UPDATE
       *
       * Admin changes the incident.
       *
       * Example:
       *
       * Pending → Verified
       */
      (updatedIncident) => {
        setIncidents((current) => {

          /**
           * Incident has become VERIFIED
           */
          const normalizedStatus = normalizeIncidentStatus(updatedIncident.status as string | undefined);
          if (
            normalizedStatus === 'VERIFIED' || normalizedStatus === 'ACTIVE'
          ) {
            const exists = current.some(
              (incident) =>
                incident.id ===
                updatedIncident.id
            );

            /**
             * Already exists:
             * update the existing incident
             */
            if (exists) {
              return current.map(
                (incident) =>
                  incident.id ===
                  updatedIncident.id
                    ? updatedIncident
                    : incident
              );
            }

            /**
             * Was Pending before,
             * now it is Verified.
             *
             * Add it to Home.
             */
            if (updatedIncident.severity === 'High') {
              notificationService.sendLocalPush({
                title: 'Crisis Alert Verified',
                body: `A ${updatedIncident.category || 'emergency'} incident has been verified.`,
                data: { incidentId: updatedIncident.id },
              });
            }

            return [
              updatedIncident,
              ...current,
            ];
          }

          /**
           * Incident is no longer Verified.
           *
           * Remove it from Home.
           */
          return current.filter(
            (incident) =>
              incident.id !==
              updatedIncident.id
          );
        });
      },

      /**
       * DELETE
       */
      (deletedIncident) => {
        setIncidents((current) =>
          current.filter(
            (incident) =>
              incident.id !==
              deletedIncident.id
          )
        );
      }
    );

    /**
     * Cleanup realtime subscription
     */
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
      >

        {/* HERO */}
        <View style={styles.heroCard}>

          <Text style={styles.eyebrow}>
            CRISIS SYNC
          </Text>

          <Text style={styles.title}>
            Stay safe and informed
          </Text>

          <Text style={styles.subtitle}>
            Monitor nearby incidents and receive
            actionable alerts in seconds.
          </Text>

        </View>

        {/* STATS */}
        <View style={styles.statsRow}>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {incidents.length}
            </Text>

            <Text style={styles.statLabel}>
              Active reports
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {
                incidents.filter(
                  (incident) =>
                    incident.severity === 'High'
                ).length
              }
            </Text>

            <Text style={styles.statLabel}>
              Urgent alerts
            </Text>
          </View>

        </View>

        {/* INCIDENTS */}
        <View style={styles.card}>

          <SectionHeader
            title="Recent incidents"
            subtitle="Verified reports from Supabase"
          />

          {/* LOADING */}
          {loading ? (

            <Text style={styles.emptyText}>
              Loading incidents...
            </Text>

          ) : incidents.length === 0 ? (

            /* EMPTY */
            <Text style={styles.emptyText}>
              {locationState === 'denied'
                ? 'No nearby incidents have been reported yet, and location access is unavailable.'
                : 'No verified incidents found.'}
            </Text>

          ) : (

            /* INCIDENT LIST */
            incidents.map((incident) => (

              <IncidentCard
                key={incident.id}
                title={incident.title ?? 'Untitled incident'}
                distance={
                  incident.distanceKm != null
                    ? `${incident.distanceKm.toFixed(1)} km away`
                    : 'Distance unavailable'
                }
                severity={incident.severity ?? 'Unknown'}
                details={
                  `${incident.description ?? 'No description provided.'}\n${incident.relevanceLabel ?? 'Location unavailable'}`
                }
                onPress={() => navigation.navigate('IncidentDetail', { incidentId: incident.id, incidentData: incident })}
              />

            ))

          )}

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      theme.colors.background,
  },

  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },

  heroCard: {
    backgroundColor:
      theme.colors.primary,
    borderRadius:
      theme.radius.xl,
    padding:
      theme.spacing.lg,
    gap:
      theme.spacing.xs,
  },

  eyebrow: {
    color:
      theme.colors.softBlue,
    fontSize:
      theme.typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  title: {
    fontSize:
      theme.typography.h1,
    fontWeight: '800',
    color:
      theme.colors.white,
  },

  subtitle: {
    fontSize:
      theme.typography.body,
    color:
      theme.colors.softBlue,
    lineHeight: 22,
  },

  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },

  statCard: {
    flex: 1,
    backgroundColor:
      theme.colors.card,
    borderRadius:
      theme.radius.lg,
    padding:
      theme.spacing.lg,
    borderWidth: 1,
    borderColor:
      theme.colors.border,
  },

  statValue: {
    fontSize:
      theme.typography.h2,
    fontWeight: '800',
    color:
      theme.colors.text,
  },

  statLabel: {
    fontSize:
      theme.typography.caption,
    color:
      theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop:
      theme.spacing.xs,
  },

  card: {
    backgroundColor:
      theme.colors.card,
    borderRadius:
      theme.radius.lg,
    padding:
      theme.spacing.lg,
    borderWidth: 1,
    borderColor:
      theme.colors.border,
    gap:
      theme.spacing.md,
  },

  emptyText: {
    fontSize:
      theme.typography.body,
    color:
      theme.colors.textMuted,
  },
});