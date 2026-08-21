import {
  extractValidCoordinates,
  filterIncidentsBySeverity,
  getBadgeSeverity,
  getIncidentSeverityCounts,
  getMarkerColorForEscalation,
  getRelativeTime,
  getSeverityColor,
} from './mapUtils';
import { theme } from '../theme/theme';
import type { Incident } from '../types/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIncident(
  overrides: Partial<Incident> = {}
): Incident {
  return {
    id: 'test-id',
    title: 'Test Incident',
    description: 'A test incident',
    category: 'Other',
    severity: 'Medium',
    location: 'Test Location',
    distanceKm: 0,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractValidCoordinates (existing tests — unchanged)
// ---------------------------------------------------------------------------

describe('mapUtils', () => {
  describe('extractValidCoordinates', () => {
    it('returns coordinates for valid inputs', () => {
      expect(extractValidCoordinates(40.7128, -74.0060)).toEqual({ latitude: 40.7128, longitude: -74.0060 });
      expect(extractValidCoordinates('40.7128', '-74.0060')).toEqual({ latitude: 40.7128, longitude: -74.0060 });
    });

    it('returns null for missing or null inputs', () => {
      expect(extractValidCoordinates(null, null)).toBeNull();
      expect(extractValidCoordinates(undefined, undefined)).toBeNull();
      expect(extractValidCoordinates(40.7128, null)).toBeNull();
    });

    it('returns null for invalid strings', () => {
      expect(extractValidCoordinates('abc', 'def')).toBeNull();
    });

    it('returns null for NaN, Infinity, and empty strings', () => {
      expect(extractValidCoordinates(Number.NaN, 0)).toBeNull();
      expect(extractValidCoordinates(0, Number.POSITIVE_INFINITY)).toBeNull();
      expect(extractValidCoordinates('Infinity', '0')).toBeNull();
      expect(extractValidCoordinates('', '')).toBeNull();
    });

    it('returns null for out-of-bounds coordinates', () => {
      expect(extractValidCoordinates(91, 0)).toBeNull();
      expect(extractValidCoordinates(-91, 0)).toBeNull();
      expect(extractValidCoordinates(0, 181)).toBeNull();
      expect(extractValidCoordinates(0, -181)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getMarkerColorForEscalation (existing tests — unchanged)
  // ---------------------------------------------------------------------------

  describe('getMarkerColorForEscalation', () => {
    it('returns correct colors based on escalation level', () => {
      expect(getMarkerColorForEscalation('CRITICAL')).toBe(theme.colors.error);
      expect(getMarkerColorForEscalation('URGENT')).toBe(theme.colors.warning);
      expect(getMarkerColorForEscalation('REVIEW')).toBe('#EAB308');
      expect(getMarkerColorForEscalation('MONITOR')).toBe(theme.colors.primary);
      expect(getMarkerColorForEscalation('NONE')).toBe(theme.colors.textMuted);
    });
  });

  // ---------------------------------------------------------------------------
  // getSeverityColor — new
  // ---------------------------------------------------------------------------

  describe('getSeverityColor', () => {
    it('returns error color for High severity', () => {
      expect(getSeverityColor('High')).toBe(theme.colors.error);
    });

    it('returns warning color for Medium severity', () => {
      expect(getSeverityColor('Medium')).toBe(theme.colors.warning);
    });

    it('returns success color for Low severity', () => {
      expect(getSeverityColor('Low')).toBe(theme.colors.success);
    });

    it('returns textMuted for unknown severity', () => {
      expect(getSeverityColor('Unknown')).toBe(theme.colors.textMuted);
      expect(getSeverityColor('')).toBe(theme.colors.textMuted);
    });
  });

  // ---------------------------------------------------------------------------
  // getBadgeSeverity — new
  // ---------------------------------------------------------------------------

  describe('getBadgeSeverity', () => {
    it('maps High → HIGH', () => {
      expect(getBadgeSeverity('High')).toBe('HIGH');
    });

    it('maps Medium → MEDIUM', () => {
      expect(getBadgeSeverity('Medium')).toBe('MEDIUM');
    });

    it('maps Low → LOW', () => {
      expect(getBadgeSeverity('Low')).toBe('LOW');
    });

    it('maps unknown → DEFAULT', () => {
      expect(getBadgeSeverity('')).toBe('DEFAULT');
      expect(getBadgeSeverity('unknown')).toBe('DEFAULT');
    });
  });

  // ---------------------------------------------------------------------------
  // getIncidentSeverityCounts — new
  // ---------------------------------------------------------------------------

  describe('getIncidentSeverityCounts', () => {
    it('returns zero counts for an empty array', () => {
      expect(getIncidentSeverityCounts([])).toEqual({
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
      });
    });

    it('counts severities correctly', () => {
      const incidents: Incident[] = [
        makeIncident({ id: '1', severity: 'High' }),
        makeIncident({ id: '2', severity: 'High' }),
        makeIncident({ id: '3', severity: 'Medium' }),
        makeIncident({ id: '4', severity: 'Low' }),
        makeIncident({ id: '5', severity: 'Low' }),
        makeIncident({ id: '6', severity: 'Low' }),
      ];
      expect(getIncidentSeverityCounts(incidents)).toEqual({
        total: 6,
        high: 2,
        medium: 1,
        low: 3,
      });
    });

    it('total equals the length of the input array', () => {
      const incidents = [
        makeIncident({ id: '1', severity: 'High' }),
        makeIncident({ id: '2', severity: 'Medium' }),
      ];
      const counts = getIncidentSeverityCounts(incidents);
      expect(counts.total).toBe(incidents.length);
    });

    it('includes incidents with null coordinates in counts', () => {
      // Counts are not filtered by coordinates — that is mapUtils responsibility
      const incidents = [
        makeIncident({ id: '1', severity: 'High' }),
        makeIncident({ id: '2', severity: 'High' }),
      ];
      expect(getIncidentSeverityCounts(incidents).high).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // filterIncidentsBySeverity — new
  // ---------------------------------------------------------------------------

  describe('filterIncidentsBySeverity', () => {
    const incidents: Incident[] = [
      makeIncident({ id: '1', severity: 'High' }),
      makeIncident({ id: '2', severity: 'High' }),
      makeIncident({ id: '3', severity: 'Medium' }),
      makeIncident({ id: '4', severity: 'Low' }),
    ];

    it('ALL returns the original array reference unchanged', () => {
      const result = filterIncidentsBySeverity(incidents, 'ALL');
      expect(result).toBe(incidents); // same reference
      expect(result.length).toBe(4);
    });

    it('filters to High severity only', () => {
      const result = filterIncidentsBySeverity(incidents, 'High');
      expect(result.length).toBe(2);
      expect(result.every((i) => i.severity === 'High')).toBe(true);
    });

    it('filters to Medium severity only', () => {
      const result = filterIncidentsBySeverity(incidents, 'Medium');
      expect(result.length).toBe(1);
      expect(result[0].severity).toBe('Medium');
    });

    it('filters to Low severity only', () => {
      const result = filterIncidentsBySeverity(incidents, 'Low');
      expect(result.length).toBe(1);
      expect(result[0].severity).toBe('Low');
    });

    it('returns empty array when no incidents match the filter', () => {
      const highOnly = [makeIncident({ id: '1', severity: 'High' })];
      expect(filterIncidentsBySeverity(highOnly, 'Low')).toEqual([]);
    });

    it('returns empty array for an empty input regardless of filter', () => {
      expect(filterIncidentsBySeverity([], 'High')).toEqual([]);
      expect(filterIncidentsBySeverity([], 'ALL')).toEqual([]);
    });

    it('incidents with null/undefined latitude are not excluded by filter (coord check is separate)', () => {
      const mixed = [
        makeIncident({ id: '1', severity: 'High' }),
        makeIncident({ id: '2', severity: 'High' }),
      ];
      // filterIncidentsBySeverity must NOT care about coordinates
      const result = filterIncidentsBySeverity(mixed, 'High');
      expect(result.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getRelativeTime — new
  // ---------------------------------------------------------------------------

  describe('getRelativeTime', () => {
    it('returns "Unknown" for null or undefined', () => {
      expect(getRelativeTime(null)).toBe('Unknown');
      expect(getRelativeTime(undefined)).toBe('Unknown');
    });

    it('returns "Unknown" for an invalid date string', () => {
      expect(getRelativeTime('not-a-date')).toBe('Unknown');
    });

    it('returns "Just now" for very recent timestamps', () => {
      const now = new Date().toISOString();
      expect(getRelativeTime(now)).toBe('Just now');
    });

    it('returns minutes ago for timestamps < 60 minutes', () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      expect(getRelativeTime(thirtyMinAgo)).toBe('30m ago');
    });

    it('returns hours ago for timestamps >= 60 minutes', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(getRelativeTime(twoHoursAgo)).toBe('2h ago');
    });

    it('returns days ago for timestamps >= 24 hours', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(getRelativeTime(threeDaysAgo)).toBe('3d ago');
    });
  });
});
