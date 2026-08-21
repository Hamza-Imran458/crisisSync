import { calculateCrisisPriority } from './crisisIntelligence';

describe('calculateCrisisPriority', () => {
  it('assigns Critical priority with correct explanation for high-risk incidents', () => {
    const result = calculateCrisisPriority({
      severity: 'High',
      distanceKm: 0.8,
      recencyMinutes: 5,
      status: 'Verified',
      hasEvidence: true,
      similarReportsCount: 3,
    });

    expect(result.priorityLevel).toBe('Critical');
    expect(result.priorityScore).toBeGreaterThanOrEqual(80);
    expect(result.explanation).toContain('Critical priority because the incident is High severity, 0.8 km away, recently reported, is verified, is supported by evidence, and has 3 similar reports.');
  });

  it('assigns High priority when distance is greater but still verified', () => {
    const result = calculateCrisisPriority({
      severity: 'High',
      distanceKm: 5,
      recencyMinutes: 30,
      status: 'Verified',
      hasEvidence: false,
      similarReportsCount: 0,
    });

    expect(result.priorityLevel).toBe('High');
    expect(result.priorityScore).toBeGreaterThanOrEqual(60);
    expect(result.explanation).toContain('High priority because the incident is High severity and is verified.');
  });

  it('assigns Medium priority for medium severity incidents without evidence', () => {
    const result = calculateCrisisPriority({
      severity: 'Medium',
      distanceKm: 2.5, // +15
      recencyMinutes: 50, // +8
      status: 'Pending',
      hasEvidence: false,
      similarReportsCount: 0,
    });

    // Medium (25) + 15 + 8 = 48
    expect(result.priorityLevel).toBe('Medium');
    expect(result.priorityScore).toBe(48);
    expect(result.explanation).toContain('Medium priority because the incident is Medium severity and 2.5 km away.');
  });

  it('assigns Low priority for low severity incidents far away', () => {
    const result = calculateCrisisPriority({
      severity: 'Low',
      distanceKm: 20, // +0
      recencyMinutes: 120, // +0
      status: 'Pending',
      hasEvidence: false,
      similarReportsCount: 0,
    });

    // Low (10)
    expect(result.priorityLevel).toBe('Low');
    expect(result.priorityScore).toBe(10);
    expect(result.explanation).toBe('Low priority because the incident is Low severity.');
  });

  it('handles grammar correctly for 2 items', () => {
    const result = calculateCrisisPriority({
      severity: 'Medium',
      distanceKm: null,
      recencyMinutes: 100,
      status: 'Verified',
      hasEvidence: false,
      similarReportsCount: 0,
    });

    expect(result.explanation).toBe('Low priority because the incident is Medium severity and is verified.');
  });
});
