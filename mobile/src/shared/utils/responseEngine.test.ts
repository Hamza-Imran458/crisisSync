import { determineResponseRecommendation } from './responseEngine';

describe('responseEngine', () => {
  it('handles critical verified fire', () => {
    const result = determineResponseRecommendation({
      category: 'Fire',
      severity: 'High',
      priorityLevel: 'Critical',
      confidenceLevel: 'High',
      escalationLevel: 'CRITICAL',
      distanceKm: 2.0,
      isVerified: true
    });

    expect(result.responseLevel).toBe('IMMEDIATE');
    expect(result.responseTitle).toBe('Fire/emergency response');
    expect(result.recommendedActions).toContain('Notify operations supervisor immediately.');
    expect(result.responseExplanation).toContain('IMMEDIATE');
    expect(result.responseExplanation).toContain('close proximity');
  });

  it('handles urgent medical', () => {
    const result = determineResponseRecommendation({
      category: 'Medical',
      severity: 'High',
      priorityLevel: 'High',
      confidenceLevel: 'High',
      escalationLevel: 'URGENT',
      distanceKm: 10.0,
      isVerified: true
    });

    expect(result.responseLevel).toBe('URGENT');
    expect(result.responseTitle).toBe('Medical response assessment');
    expect(result.recommendedActions).toContain('Prioritize medical assessment based on severity.');
  });

  it('handles high-severity flooding', () => {
    const result = determineResponseRecommendation({
      category: 'Flooding',
      severity: 'High',
      priorityLevel: 'High',
      confidenceLevel: 'Medium',
      escalationLevel: 'URGENT',
      distanceKm: null,
      isVerified: true
    });

    expect(result.responseLevel).toBe('URGENT');
    expect(result.responseTitle).toBe('Rescue/evacuation assessment');
    expect(result.recommendedActions).toContain('Assess immediate evacuation needs.');
  });

  it('handles unverified high-severity incident', () => {
    const result = determineResponseRecommendation({
      category: 'Security',
      severity: 'High',
      priorityLevel: 'High',
      confidenceLevel: 'Low',
      escalationLevel: 'URGENT',
      distanceKm: 1.5,
      isVerified: false
    });

    expect(result.responseLevel).toBe('URGENT');
    expect(result.recommendedActions[0]).toBe('Verify incident details and gather evidence.');
    expect(result.responseExplanation).toContain('unverified');
  });

  it('handles low-severity incident', () => {
    const result = determineResponseRecommendation({
      category: 'Other',
      severity: 'Low',
      priorityLevel: 'Low',
      confidenceLevel: 'High',
      escalationLevel: 'NONE',
      distanceKm: null,
      isVerified: true
    });

    expect(result.responseLevel).toBe('MONITOR');
    expect(result.responseTitle).toBe('General emergency assessment');
    expect(result.recommendedActions).toContain('Continue standard monitoring.');
  });

  it('handles unknown category', () => {
    const result = determineResponseRecommendation({
      category: '',
      severity: 'High',
      priorityLevel: 'High',
      confidenceLevel: 'High',
      escalationLevel: 'URGENT',
      distanceKm: null,
      isVerified: true
    });

    expect(result.responseLevel).toBe('URGENT');
    expect(result.responseTitle).toBe('General emergency assessment');
    expect(result.responseExplanation).toContain('unknown');
  });
});
