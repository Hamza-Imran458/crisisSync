import { EscalationLevel } from './escalationEngine';
import { theme } from '../theme/theme';
import type { Incident } from '../types/app';

export type ValidatedCoordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Severity filter keys used across the map UI.
 * Matches the `Incident.severity` field values plus 'ALL'.
 */
export type SeverityFilter = 'ALL' | 'High' | 'Medium' | 'Low';

/**
 * Safely parses and validates latitude and longitude.
 * Returns null if the coordinates are invalid, missing, or outside standard bounds.
 */
export function extractValidCoordinates(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined
): ValidatedCoordinates | null {
  if (lat == null || lng == null) return null;

  const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
  const longitude = typeof lng === 'string' ? parseFloat(lng) : lng;

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

/**
 * Maps an escalation level to a corresponding hex color code for map markers.
 * Used to drive the `pinColor` prop on Marker components.
 */
export function getMarkerColorForEscalation(level: EscalationLevel): string {
  switch (level) {
    case 'CRITICAL':
      return theme.colors.error; // Crimson
    case 'URGENT':
      return theme.colors.warning; // Amber
    case 'REVIEW':
      return '#EAB308'; // Yellow
    case 'MONITOR':
      return theme.colors.primary; // Navy
    case 'NONE':
      return theme.colors.textMuted; // Gray
    default:
      return theme.colors.textMuted;
  }
}

/**
 * Maps a human-readable incident severity value to a theme color.
 * Used for UI legend dots, filter chips, and severity indicators.
 * This is distinct from getMarkerColorForEscalation() which operates
 * on the escalation engine's output level.
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'High':
      return theme.colors.error;
    case 'Medium':
      return theme.colors.warning;
    case 'Low':
      return theme.colors.success;
    default:
      return theme.colors.textMuted;
  }
}

/**
 * Returns the Badge severity variant string for a given incident severity.
 * Maps the Incident model's severity to the Badge component's accepted type.
 */
export function getBadgeSeverity(
  severity: string
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'DEFAULT' {
  switch (severity) {
    case 'High':
      return 'HIGH';
    case 'Medium':
      return 'MEDIUM';
    case 'Low':
      return 'LOW';
    default:
      return 'DEFAULT';
  }
}

/**
 * Returns a formatted relative time string from a createdAt ISO string.
 * Examples: "Just now", "5m ago", "2h ago", "3d ago"
 */
export function getRelativeTime(createdAt: string | undefined | null): string {
  if (!createdAt) return 'Unknown';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Unknown';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Calculates severity counts from an array of incidents.
 * Incidents without valid coordinates are included in counts —
 * this reflects the total incident state, not just mapped incidents.
 */
export type SeverityCounts = {
  total: number;
  high: number;
  medium: number;
  low: number;
};

export function getIncidentSeverityCounts(incidents: Incident[]): SeverityCounts {
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const incident of incidents) {
    if (incident.severity === 'High') high++;
    else if (incident.severity === 'Medium') medium++;
    else if (incident.severity === 'Low') low++;
  }

  return { total: incidents.length, high, medium, low };
}

/**
 * Applies a severity filter to an incident array.
 * 'ALL' returns the original array reference unchanged (no allocation).
 */
export function filterIncidentsBySeverity(
  incidents: Incident[],
  filter: SeverityFilter
): Incident[] {
  if (filter === 'ALL') return incidents;
  return incidents.filter((i) => i.severity === filter);
}
