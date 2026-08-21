import { calculateIncidentConfidence } from './incidentIntelligenceService';
import type { Incident } from '../types/app';

describe('calculateIncidentConfidence', () => {
  it('should return High confidence for verified incident with evidence', () => {
    const incident: Incident = {
      id: '1',
      title: 'Test',
      description: 'Test desc',
      category: 'Fire',
      severity: 'Medium',
      location: 'Here',
      distanceKm: 1,
      createdAt: '2023-10-10',
      status: 'Verified',
    };
    
    const result = calculateIncidentConfidence(incident, true, 0);
    expect(result.confidenceLevel).toBe('High');
    expect(result.confidenceReason).toContain('verified status');
    expect(result.confidenceReason).toContain('supported by evidence');
  });

  it('should return Low confidence for pending incident with no evidence and duplicates', () => {
    const incident: Incident = {
      id: '2',
      title: 'Test',
      description: 'Test desc',
      category: 'Fire',
      severity: 'Low',
      location: 'Here',
      distanceKm: 1,
      createdAt: '2023-10-10',
      status: 'Pending',
    };
    
    const result = calculateIncidentConfidence(incident, false, 2);
    expect(result.confidenceLevel).toBe('Low');
    expect(result.confidenceReason).toContain('similar to existing incidents');
  });
});
