import { auditService } from './auditService';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('auditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert an audit log and return it', async () => {
    const mockUser = { user: { id: 'user-123' } };
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: mockUser });

    const mockInsert = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'log-1',
        incident_id: 'inc-1',
        event_type: 'Incident Reported',
        previous_status: null,
        new_status: 'Pending',
        actor_id: 'user-123',
        note: null,
        created_at: '2023-10-10T10:00:00Z',
      },
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    });

    const result = await auditService.logIncidentEvent({
      incidentId: 'inc-1',
      eventType: 'Incident Reported',
      newStatus: 'Pending',
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe('log-1');
    expect(result?.eventType).toBe('Incident Reported');
    expect(mockInsert).toHaveBeenCalledWith([{
      incident_id: 'inc-1',
      event_type: 'Incident Reported',
      previous_status: undefined,
      new_status: 'Pending',
      actor_id: 'user-123',
      note: undefined,
    }]);
  });
});
