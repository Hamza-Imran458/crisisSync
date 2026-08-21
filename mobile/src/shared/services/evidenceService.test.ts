import { auditService } from './auditService';
import { evidenceService, summarizeEvidenceRecords, validateEvidenceUploadInput } from './evidenceService';
import { verifyIncidentWorkflow } from './incidentService';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
      remove: jest.fn(),
    },
  },
  saveIncident: jest.fn(),
  updateIncident: jest.fn(),
  fetchIncidentsFromDb: jest.fn(),
  subscribeToIncidents: jest.fn(),
}));

jest.mock('./auditService', () => ({
  auditService: {
    logIncidentEvent: jest.fn(),
    fetchIncidentAuditLogs: jest.fn(),
  },
}));

describe('evidenceService business logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hasEvidence=false when there are no evidence records', async () => {
    expect(summarizeEvidenceRecords([])).toEqual({ hasEvidence: false, evidenceCount: 0 });
    expect(await evidenceService.hasIncidentEvidence('incident-1')).toBe(false);
  });

  it('returns hasEvidence=true and the correct count for one evidence record', () => {
    const summary = summarizeEvidenceRecords([
      { id: 'ev-1', incidentId: 'incident-1', filePath: 'incident-1/photo.jpg', fileType: 'image/jpeg', createdAt: '2025-01-01T00:00:00Z' },
    ]);

    expect(summary).toEqual({ hasEvidence: true, evidenceCount: 1 });
  });

  it('counts multiple evidence records accurately', () => {
    const summary = summarizeEvidenceRecords([
      { id: 'ev-1', incidentId: 'incident-1', filePath: 'incident-1/photo-1.jpg', fileType: 'image/jpeg', createdAt: '2025-01-01T00:00:00Z' },
      { id: 'ev-2', incidentId: 'incident-1', filePath: 'incident-1/photo-2.png', fileType: 'image/png', createdAt: '2025-01-01T00:01:00Z' },
      { id: 'ev-3', incidentId: 'incident-2', filePath: 'incident-2/other.mp4', fileType: 'video/mp4', createdAt: '2025-01-01T00:02:00Z' },
    ]);

    expect(summary).toEqual({ hasEvidence: true, evidenceCount: 3 });
  });

  it('handles invalid or missing metadata safely', () => {
    expect(validateEvidenceUploadInput('', 'image/jpeg')).toEqual({ valid: false, reason: 'Incident ID is required.' });
    expect(validateEvidenceUploadInput('incident-1', '   ')).toEqual({ valid: false, reason: 'A valid file type is required.' });
  });

  it('handles upload failures without corrupting incident state', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-123' } } });
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: new Error('upload failed') }),
    });

    const result = await evidenceService.uploadIncidentEvidence('incident-1', 'file:///tmp/incident.jpg', 'image/jpeg');
    expect(result).toBeNull();
  });

  it('keeps verification independent from evidence', () => {
    expect(summarizeEvidenceRecords([])).toEqual({ hasEvidence: false, evidenceCount: 0 });
    expect(summarizeEvidenceRecords([{ id: 'ev-1', incidentId: 'incident-1', filePath: 'incident-1/photo.jpg', fileType: 'image/jpeg', createdAt: '2025-01-01T00:00:00Z' }])).toEqual({ hasEvidence: true, evidenceCount: 1 });
  });

  it('generates the correct audit event for human verification', async () => {
    const { updateIncident } = jest.requireMock('./supabase');
    updateIncident.mockResolvedValue({ id: 'incident-1', status: 'Verified' });

    await verifyIncidentWorkflow('incident-1', 'Pending');

    expect(auditService.logIncidentEvent).toHaveBeenCalledWith({
      incidentId: 'incident-1',
      eventType: 'INCIDENT_VERIFIED',
      previousStatus: 'Pending',
      newStatus: 'Verified',
      note: 'Verified by administrator',
    });
  });
});
