import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { theme } from '../../../shared/theme/theme';
import {
  fetchIncidentsFromDb,
  subscribeToIncidents,
  supabase,
} from '../../../shared/services/supabase';
import { normalizeIncidentStatus } from '../../../shared/utils/incidentWorkflow';
import { calculateCrisisPriority } from '../../../shared/utils/crisisIntelligence';
import { determineEscalation, type EscalationLevel } from '../../../shared/utils/escalationEngine';
import {
  extractValidCoordinates,
  filterIncidentsBySeverity,
  getIncidentSeverityCounts,
  getMarkerColorForEscalation,
  type SeverityFilter,
} from '../../../shared/utils/mapUtils';
import { getUserLocationForApp } from '../../../shared/services/incidentIntelligenceService';
import { logger } from '../../../shared/utils/logger';
import type { Incident } from '../../../shared/types/app';
import type { RootStackParamList } from '../../../app/navigation/types';

import { MapFilterBar } from '../components/MapFilterBar';
import { MapLegend } from '../components/MapLegend';
import { IncidentBottomSheet } from '../components/IncidentBottomSheet';
import { MapLocationButton } from '../components/MapLocationButton';

// ---------------------------------------------------------------------------

const { width, height } = Dimensions.get('window');

// Default map center — Lahore, Pakistan (existing project default)
const DEFAULT_REGION = {
  latitude: 31.4949139,
  longitude: 74.2466163,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// ---------------------------------------------------------------------------

type MappedIncident = Incident & {
  validCoords: { latitude: number; longitude: number };
  escalationLevel: EscalationLevel;
  priorityScore: number;
};

// ---------------------------------------------------------------------------

export function MapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── Map module (dynamically loaded to survive missing native module) ──────
  const [mapComponents, setMapComponents] = useState<{
    MapView?: any;
    Marker?: any;
  } | null>(null);
  const [mapAvailable, setMapAvailable] = useState<boolean | null>(null);
  const mapRef = useRef<any>(null);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // ── User location ──────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedIncident, setSelectedIncident] =
    useState<MappedIncident | null>(null);

  // =========================================================================
  // DYNAMIC MAP MODULE LOAD
  // =========================================================================

  useEffect(() => {
    let mounted = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const maps = require('react-native-maps');
      if (!mounted) return;
      setMapComponents({
        MapView: maps.default ?? maps,
        Marker: maps.Marker,
      });
      setMapAvailable(true);
    } catch (err) {
      logger.warn('MapScreen: react-native-maps not available', err);
      if (!mounted) return;
      setMapAvailable(false);
      setMapComponents(null);
    }
    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================================
  // USER LOCATION
  // =========================================================================

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loc = await getUserLocationForApp();
      if (
        mounted &&
        typeof loc.latitude === 'number' &&
        typeof loc.longitude === 'number' &&
        !('permissionDenied' in loc && loc.permissionDenied)
      ) {
        setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================================
  // INCIDENT LOAD
  // =========================================================================

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchIncidentsFromDb();
      setIncidents(data ?? []);
    } catch (err) {
      logger.warn('MapScreen: failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIncidents();
    }, [loadIncidents])
  );

  // =========================================================================
  // REALTIME SUBSCRIPTION
  // =========================================================================

  useEffect(() => {
    const channel = subscribeToIncidents(
      'map-incidents-channel',

      // INSERT
      (newIncident) => {
        setIncidents((current) =>
          current.some((i) => i.id === newIncident.id)
            ? current
            : [newIncident, ...current]
        );
      },

      // UPDATE
      (updatedIncident) => {
        setIncidents((current) =>
          current.some((i) => i.id === updatedIncident.id)
            ? current.map((i) =>
                i.id === updatedIncident.id ? updatedIncident : i
              )
            : [updatedIncident, ...current]
        );
        // Keep selected incident in sync
        setSelectedIncident((sel) =>
          sel && sel.id === updatedIncident.id
            ? { ...sel, ...updatedIncident }
            : sel
        );
      },

      // DELETE
      (deletedIncident) => {
        setIncidents((current) =>
          current.filter((i) => i.id !== deletedIncident.id)
        );
        // Dismiss sheet if the deleted incident was selected
        setSelectedIncident((sel) =>
          sel && sel.id === deletedIncident.id ? null : sel
        );
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // =========================================================================
  // DIAGNOSTIC LOGGING
  // =========================================================================

  useEffect(() => {
    let valid = 0;
    let invalid = 0;
    for (const i of incidents) {
      if (extractValidCoordinates((i as any).latitude, (i as any).longitude)) {
        valid++;
      } else {
        invalid++;
      }
    }
    logger.info(
      'MapScreen: incidents total=', incidents.length,
      'valid=', valid,
      'invalid=', invalid,
      'mapAvailable=', mapAvailable
    );
  }, [incidents, mapAvailable]);

  // =========================================================================
  // DERIVED DATA — FILTERED + MAPPED INCIDENTS
  // =========================================================================

  const severityCounts = useMemo(
    () => getIncidentSeverityCounts(incidents),
    [incidents]
  );

  const mappedIncidents = useMemo<MappedIncident[]>(() => {
    // 1. Apply severity filter
    const filtered = filterIncidentsBySeverity(incidents, severityFilter);

    // 2. Validate coordinates and enrich with escalation
    const result: MappedIncident[] = [];
    for (const incident of filtered) {
      const coords = extractValidCoordinates(
        (incident as any).latitude,
        (incident as any).longitude
      );
      if (!coords) continue;

      const recencyMinutes = incident.createdAt
        ? (Date.now() - new Date(incident.createdAt).getTime()) / 60000
        : 15;

      const priority = calculateCrisisPriority({
        severity: incident.severity ?? 'Medium',
        distanceKm:
          (incident as any).distance_km ?? incident.distanceKm ?? null,
        recencyMinutes,
        status: incident.status,
        hasEvidence: false,
        similarReportsCount: 0,
      });

      const escalation = determineEscalation({
        priorityScore: priority.priorityScore,
        priorityLevel: priority.priorityLevel,
        severity: incident.severity ?? 'Medium',
        isVerified:
          normalizeIncidentStatus(incident.status) === 'VERIFIED' ||
          normalizeIncidentStatus(incident.status) === 'ACTIVE',
        distanceKm:
          (incident as any).distance_km ?? incident.distanceKm ?? null,
        incidentAgeMinutes: recencyMinutes,
        hasEvidence: false,
        similarReportsCount: 0,
        currentStatus: incident.status,
      });

      result.push({
        ...incident,
        validCoords: coords,
        escalationLevel: escalation.escalationLevel,
        priorityScore: priority.priorityScore,
      });
    }

    return result;
  }, [incidents, severityFilter]);

  const unmappedCount = useMemo(() => {
    const filtered = filterIncidentsBySeverity(incidents, severityFilter);
    return filtered.length - mappedIncidents.length;
  }, [incidents, severityFilter, mappedIncidents]);

  // =========================================================================
  // MAP INITIAL REGION
  // =========================================================================

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    if (mappedIncidents.length > 0) {
      return {
        latitude: mappedIncidents[0].validCoords.latitude,
        longitude: mappedIncidents[0].validCoords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    return DEFAULT_REGION;
  }, [userLocation, mappedIncidents]);

  // =========================================================================
  // LOCATION BUTTON HANDLER
  // =========================================================================

  const handleCenterOnUser = useCallback(async () => {
    // If we already have location, animate to it immediately
    if (userLocation && mapRef.current) {
      try {
        mapRef.current.animateToRegion?.(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          500
        );
      } catch (err) {
        logger.warn('MapScreen: animateToRegion failed', err);
      }
      return;
    }

    // Try to fetch location on-demand
    const loc = await getUserLocationForApp();
    if (
      typeof loc.latitude === 'number' &&
      typeof loc.longitude === 'number' &&
      !('permissionDenied' in loc && loc.permissionDenied)
    ) {
      const coords = { latitude: loc.latitude, longitude: loc.longitude };
      setUserLocation(coords);
      if (mapRef.current) {
        try {
          mapRef.current.animateToRegion?.(
            { ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 },
            500
          );
        } catch (err) {
          logger.warn('MapScreen: animateToRegion failed', err);
        }
      }
    }
  }, [userLocation]);

  // =========================================================================
  // MARKER PRESS
  // =========================================================================

  const handleMarkerPress = useCallback(
    (incident: MappedIncident) => {
      setSelectedIncident(incident);
      // Animate map to center on the selected marker
      if (mapRef.current) {
        try {
          mapRef.current.animateToRegion?.(
            {
              latitude: incident.validCoords.latitude,
              longitude: incident.validCoords.longitude,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            },
            400
          );
        } catch (err) {
          logger.warn('MapScreen: animateToRegion failed', err);
        }
      }
    },
    []
  );

  // =========================================================================
  // RENDER — MAP CONTENT
  // =========================================================================

  const renderMapContent = () => {
    // Loading (first load only — map may already be visible on reload)
    if (loading && incidents.length === 0) {
      return (
        <View style={styles.overlayCenter}>
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>
              Loading incident intelligence…
            </Text>
          </View>
        </View>
      );
    }

    // Native module unavailable (dev client not rebuilt)
    if (mapAvailable === false) {
      return (
        <View style={styles.overlayCenter}>
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>Map unavailable</Text>
            <Text style={styles.statusCardBody}>
              Rebuild the development client with react-native-maps installed.
            </Text>
          </View>
        </View>
      );
    }

    // Module loading (null = not yet attempted)
    if (!mapComponents?.MapView) {
      return (
        <View style={styles.overlayCenter}>
          <Text style={styles.mutedText}>Preparing map…</Text>
        </View>
      );
    }

    return (
      <>
        <mapComponents.MapView
          ref={mapRef}
          accessibilityLabel="CrisisSync incident map"
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
          onPress={() => setSelectedIncident(null)}
        >
          {mappedIncidents.map((incident) => (
            <mapComponents.Marker
              key={incident.id}
              accessibilityLabel={`Incident: ${incident.title ?? 'untitled'}, severity ${incident.severity ?? 'unknown'}`}
              coordinate={incident.validCoords}
              pinColor={getMarkerColorForEscalation(incident.escalationLevel)}
              onPress={(e: any) => {
                e.stopPropagation?.();
                handleMarkerPress(incident);
              }}
            />
          ))}
        </mapComponents.MapView>

        {/* Empty state overlay — map visible behind */}
        {!loading && mappedIncidents.length === 0 && (
          <View style={styles.overlayBottom}>
            <View style={styles.statusCard}>
              <Text style={styles.statusCardTitle}>No incidents mapped</Text>
              <Text style={styles.statusCardBody}>
                {severityFilter !== 'ALL'
                  ? `No ${severityFilter.toLowerCase()} severity incidents have valid geographic coordinates.`
                  : 'All reported incidents are currently missing valid geographic coordinates.'}
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Incident Map</Text>
            <Text style={styles.headerSubtitle}>
              {loading && incidents.length === 0
                ? 'Loading…'
                : `${mappedIncidents.length} active · ${unmappedCount} unmapped`}
            </Text>
          </View>
          {/* High-priority count badge */}
          {severityCounts.high > 0 && (
            <View style={styles.highBadge}>
              <Text style={styles.highBadgeText}>
                {severityCounts.high} High
              </Text>
            </View>
          )}
        </View>

        {/* ── FILTER BAR ──────────────────────────────────────────── */}
        <MapFilterBar
          activeFilter={severityFilter}
          onFilterChange={(f) => {
            setSeverityFilter(f);
            setSelectedIncident(null);
          }}
          counts={severityCounts}
        />
      </View>

      {/* ── MAP CONTAINER ───────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        {renderMapContent()}

        {/* ── LEGEND ──────────────────────────────────────────────── */}
        <View style={styles.legendPosition}>
          <MapLegend />
        </View>

        {/* ── LOCATION BUTTON ─────────────────────────────────────── */}
        <View style={styles.locationButtonPosition}>
          <MapLocationButton
            hasLocation={!!userLocation}
            onPress={handleCenterOnUser}
          />
        </View>
      </View>

      {/* ── BOTTOM SHEET ────────────────────────────────────────────── */}
      {selectedIncident && (
        <IncidentBottomSheet
          incident={selectedIncident}
          onDismiss={() => setSelectedIncident(null)}
          onViewDetail={() => {
            setSelectedIncident(null);
            navigation.navigate('IncidentDetail', {
              incidentId: selectedIncident.id,
              incidentData: selectedIncident,
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.h3,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: theme.typography.caption,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    fontWeight: '500',
  },
  highBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  highBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.white,
    letterSpacing: 0.3,
  },

  // ── Map ───────────────────────────────────────────────────────────────────
  mapContainer: {
    flex: 1,
    backgroundColor: theme.colors.border,
  },
  map: {
    width,
    height: '100%',
  },

  // ── Floating overlays ─────────────────────────────────────────────────────
  legendPosition: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 20,
  },
  locationButtonPosition: {
    position: 'absolute',
    bottom: theme.spacing.xxl + theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 20,
  },

  // ── Status cards ──────────────────────────────────────────────────────────
  overlayCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  statusCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
    ...theme.shadows.md,
  },
  statusCardTitle: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusCardBody: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  mutedText: {
    fontSize: theme.typography.body,
    color: theme.colors.textMuted,
  },
});
