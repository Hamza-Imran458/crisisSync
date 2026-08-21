import { filterAdminIncidents, extractUniqueCategories } from './adminUtils';
import type { Incident } from '../types/app';

function makeIncident(overrides: Partial<Incident> = {}): Incident {
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

describe('adminUtils', () => {
  describe('extractUniqueCategories', () => {
    it('returns a sorted list of unique categories', () => {
      const incidents = [
        makeIncident({ category: 'Fire' }),
        makeIncident({ category: 'Flooding' }),
        makeIncident({ category: 'Fire' }),
        makeIncident({ category: '' }), // Empty defaults to 'Other' in util
      ];

      const result = extractUniqueCategories(incidents);
      expect(result).toEqual(['Fire', 'Flooding', 'Other']);
    });
  });

  describe('filterAdminIncidents', () => {
    const incidents = [
      makeIncident({ id: '1', title: 'Big Fire', category: 'Fire', status: 'Pending', severity: 'High', location: 'Downtown' }),
      makeIncident({ id: '2', title: 'Small Flood', category: 'Flooding', status: 'Verified', severity: 'Low', location: 'Uptown' }),
      makeIncident({ id: '3', title: 'Car Crash', category: 'Accident', status: 'ACTIVE' as any, severity: 'Medium', location: 'Highway 5' }),
      makeIncident({ id: '4', title: 'False Alarm', category: 'Other', status: 'Rejected', severity: 'Low', location: 'Downtown' }),
      makeIncident({ id: '5', title: 'Resolved Issue', category: 'Other', status: 'Resolved', severity: 'Medium', location: 'Uptown' }),
    ];

    it('returns all incidents when all filters are ALL', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: '',
        status: 'ALL',
        severity: 'ALL',
        category: 'ALL',
      });
      expect(result.length).toBe(5);
    });

    it('filters by status', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: '',
        status: 'PENDING',
        severity: 'ALL',
        category: 'ALL',
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by severity', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: '',
        status: 'ALL',
        severity: 'Low',
        category: 'ALL',
      });
      expect(result.length).toBe(2);
      expect(result.map(i => i.id)).toEqual(['2', '4']);
    });

    it('filters by category', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: '',
        status: 'ALL',
        severity: 'ALL',
        category: 'Fire',
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by search query (title)', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: 'flood',
        status: 'ALL',
        severity: 'ALL',
        category: 'ALL',
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('2');
    });

    it('filters by search query (location)', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: 'downtown',
        status: 'ALL',
        severity: 'ALL',
        category: 'ALL',
      });
      expect(result.length).toBe(2);
      expect(result.map(i => i.id)).toEqual(['1', '4']);
    });

    it('combines filters with AND logic', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: 'downtown',
        status: 'REJECTED',
        severity: 'Low',
        category: 'Other',
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('4');
    });

    it('combines filters resulting in empty array if no match', () => {
      const result = filterAdminIncidents(incidents, {
        searchQuery: 'downtown',
        status: 'PENDING',
        severity: 'Low',
        category: 'ALL',
      });
      expect(result.length).toBe(0);
    });
  });
});
