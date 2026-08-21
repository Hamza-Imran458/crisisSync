import {
  calculateEscalationDistribution,
  calculateCategoryDistribution,
  calculateBacklogMetrics,
  calculateAverageVerificationTime,
  determineOperationalHealth,
} from './metricsService';
import type { Incident, AuditLog } from '../types/app';

describe('metricsService', () => {
  const baseIncident: Incident = {
    id: '1',
    title: 'Test',
    description: 'Test',
    category: 'Unknown',
    severity: 'Medium',
    location: 'Unknown location',
    distanceKm: 0,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reporterId: 'user1',
  };

  it('handles empty incident lists', () => {
    expect(calculateEscalationDistribution([]).distribution).toEqual({
      CRITICAL: 0,
      URGENT: 0,
      REVIEW: 0,
      MONITOR: 0,
      NONE: 0,
    });
    expect(calculateCategoryDistribution([])).toEqual({});
    expect(calculateBacklogMetrics([], new Map()).total).toBe(0);
    expect(calculateAverageVerificationTime([], []).value).toBeNull();
  });

  it('calculates category distribution', () => {
    const incs: Incident[] = [
      { ...baseIncident, id: '1', category: 'Fire' },
      { ...baseIncident, id: '2', category: 'Medical' },
      { ...baseIncident, id: '3', category: 'Fire' },
      { ...baseIncident, id: '4', category: '' },
    ];
    const dist = calculateCategoryDistribution(incs);
    expect(dist).toEqual({ Fire: 2, Medical: 1, Unknown: 1 });
  });

  it('calculates verification latency correctly with audit logs', () => {
    const created = new Date('2023-01-01T10:00:00Z');
    const verified = new Date('2023-01-01T10:45:00Z');
    
    const incs: Incident[] = [
      { ...baseIncident, id: '1', status: 'Verified', createdAt: created.toISOString() },
    ];
    const logs: AuditLog[] = [
      {
        id: 'log1',
        incidentId: '1',
        eventType: 'STATUS_CHANGE',
        newStatus: 'Verified',
        createdAt: verified.toISOString(),
      } as AuditLog,
    ];

    const avg = calculateAverageVerificationTime(incs, logs);
    expect(avg.value).toBe(45); // 45 minutes
  });

  it('calculates operational health correctly', () => {
    // CRITICAL: pending Critical >= 1
    const health1 = determineOperationalHealth(
      { total: 10, pending: 1, verified: 9, rejected: 0, pendingHighSeverity: 1, pendingCriticalEscalation: 1, pendingUrgentEscalation: 0 },
      { value: 10, label: '' }
    );
    expect(health1.level).toBe('CRITICAL');

    // WARNING: pending high severity >= 3
    const health2 = determineOperationalHealth(
      { total: 10, pending: 3, verified: 7, rejected: 0, pendingHighSeverity: 3, pendingCriticalEscalation: 0, pendingUrgentEscalation: 0 },
      { value: 10, label: '' }
    );
    expect(health2.level).toBe('WARNING');

    // NORMAL
    const health3 = determineOperationalHealth(
      { total: 10, pending: 2, verified: 8, rejected: 0, pendingHighSeverity: 0, pendingCriticalEscalation: 0, pendingUrgentEscalation: 0 },
      { value: 10, label: '' }
    );
    expect(health3.level).toBe('NORMAL');
  });

  it('falls back to updated_at if audit logs are missing', () => {
    const created = new Date('2023-01-01T10:00:00Z');
    const updated = new Date('2023-01-01T11:00:00Z'); // 60 mins
    
    const incs: Incident[] = [
      { ...baseIncident, id: '1', status: 'Verified', createdAt: created.toISOString(), updatedAt: updated.toISOString() },
    ];
    
    const avg = calculateAverageVerificationTime(incs, []);
    expect(avg.value).toBe(60);
  });
});
