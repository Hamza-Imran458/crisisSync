import { validateIncidentInput, isAlertRelevant, getAlertSeverityLabel, canTransitionIncidentStatus, normalizeIncidentStatus } from './incidentWorkflow';

describe('incident workflow utilities', () => {
  it('accepts a valid incident report', () => {
    const result = validateIncidentInput({
      title: 'Flooding',
      description: 'Water is rising near the station.',
      category: 'Flooding',
      severity: 'High',
      location: 'North Gate',
      distanceKm: 0.8,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects incomplete incident data', () => {
    const result = validateIncidentInput({
      title: '',
      description: 'bad',
      category: 'Flooding',
      severity: 'Critical' as any,
      location: '',
      distanceKm: -1,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('allows incident reports with empty category (now optional)', () => {
    const result = validateIncidentInput({
      title: 'Valid Title',
      description: 'A valid description of the incident.',
      category: '', // Empty category
      severity: 'Medium',
      location: 'Valid Location',
      distanceKm: 1.2,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags alerts that are within the user radius', () => {
    expect(isAlertRelevant(0.8, 3)).toBe(true);
  });

  it('formats severity labels for the UI', () => {
    expect(getAlertSeverityLabel('emergency')).toBe('Emergency');
    expect(getAlertSeverityLabel('warning')).toBe('Warning');
    expect(getAlertSeverityLabel('info')).toBe('Information');
  });

  it('allows realistic incident lifecycle transitions', () => {
    expect(canTransitionIncidentStatus('Pending', 'Verified')).toBe(true);
    expect(canTransitionIncidentStatus('Pending', 'Resolved')).toBe(false);
    expect(canTransitionIncidentStatus('Verified', 'Active')).toBe(true);
    expect(canTransitionIncidentStatus('Active', 'Resolved')).toBe(true);
    expect(canTransitionIncidentStatus('Resolved', 'Active')).toBe(false);
  });

  it('normalizes legacy and canonical incident statuses', () => {
    expect(normalizeIncidentStatus('Pending')).toBe('PENDING_REVIEW');
    expect(normalizeIncidentStatus('Verified')).toBe('VERIFIED');
    expect(normalizeIncidentStatus('VERIFIED')).toBe('VERIFIED');
    expect(normalizeIncidentStatus('Rejected')).toBe('REJECTED');
    expect(normalizeIncidentStatus('ACTIVE')).toBe('ACTIVE');
  });
});
