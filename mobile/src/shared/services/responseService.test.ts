import { responseService } from './responseService';
import { supabase } from './supabase';
import { auditService } from './auditService';

jest.mock('./notificationService', () => ({
  notificationService: {
    notifyResponseDispatch: jest.fn(),
  },
}));

jest.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('./auditService', () => ({
  auditService: {
    logIncidentEvent: jest.fn(),
  },
}));

describe('responseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatch creates response and audit event', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });

    const profileState = { data: { role: 'admin', is_admin: true }, error: null };
    const responseState = { data: { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Dispatched', notes: 'Please assist', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }, error: null };

    const profileChain = { maybeSingle: jest.fn().mockResolvedValue(profileState) };
    const insertChain = { select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue(responseState) }) };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(profileChain) }) };
      if (table === 'incidents') return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: { title: 'Test incident', severity: 'high', location: 'Main St' }, error: null }) }),
        }),
      };
      if (table === 'responses') return { insert: jest.fn().mockReturnValue(insertChain) };
      return {};
    });

    const result = await responseService.dispatchResponse({
      incidentId: 'inc-1',
      assignedTo: 'op-1',
      notes: 'Please assist',
    });

    expect(result?.id).toBe('resp-1');
    expect(auditService.logIncidentEvent).toHaveBeenCalledWith(expect.objectContaining({
      incidentId: 'inc-1',
      eventType: 'RESPONSE_DISPATCHED',
    }));
  });

  it('unauthorized dispatch fails', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'citizen-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen', is_admin: false }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.dispatchResponse({ incidentId: 'inc-1', assignedTo: 'op-1' })).rejects.toThrow('Authorization');
  });

  it('rejects dispatch without an incident id', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin', is_admin: true }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.dispatchResponse({ incidentId: '', assignedTo: 'op-1' })).rejects.toThrow('Incident ID is required');
  });

  it('rejects dispatch without an assigned operator', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin', is_admin: true }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.dispatchResponse({ incidentId: 'inc-1', assignedTo: '' })).rejects.toThrow('assigned operator');
  });

  it('operator can acknowledge own response', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null });

    const responseRow = { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Dispatched', notes: 'Please assist', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    const updateState = { data: { ...responseRow, status: 'Acknowledged', updated_at: '2026-01-01T00:01:00Z' }, error: null };

    const responseSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: responseRow, error: null }),
      }),
    });

    const responseUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue(updateState) }),
      }),
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'responses') {
        return { select: responseSelect, update: responseUpdate };
      }
      if (table === 'profiles') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'operator', is_admin: false }, error: null }) }) }) };
      }
      return {};
    });

    const result = await responseService.ackResponse('resp-1', 'Acknowledged by operator');

    expect(result?.status).toBe('Acknowledged');
    expect(auditService.logIncidentEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'RESPONSE_ACK' }));
  });

  it('operator cannot acknowledge another operator response', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'op-2' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'responses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Dispatched' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'operator', is_admin: false }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.ackResponse('resp-1', 'Nope')).rejects.toThrow('not assigned');
  });

  it('on-scene transition is only allowed after acknowledgement', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'responses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Dispatched' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'operator', is_admin: false }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.markResponseOnScene('resp-1')).rejects.toThrow('Invalid response status transition');
  });

  it('complete transition is only allowed after on-scene', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'responses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Acknowledged' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'operator', is_admin: false }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.completeResponse('resp-1')).rejects.toThrow('Invalid response status transition');
  });

  it('invalid status transitions fail', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'responses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Completed' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'operator', is_admin: false }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.markResponseOnScene('resp-1')).rejects.toThrow('Invalid');
  });

  it('cancellation works for authorized admin', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });

    const responseRow = { id: 'resp-1', incident_id: 'inc-1', assigned_to: 'op-1', status: 'Dispatched', notes: 'Please assist', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    const updateState = { data: { ...responseRow, status: 'Cancelled', updated_at: '2026-01-01T00:02:00Z' }, error: null };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin', is_admin: true }, error: null }),
            }),
          }),
        };
      }
      if (table === 'responses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: responseRow, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue(updateState) }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await responseService.cancelResponse('resp-1', 'Weather delay');
    expect(result?.status).toBe('Cancelled');
    expect(auditService.logIncidentEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'RESPONSE_CANCELLED' }));
  });

  it('surfaces a 42501 Supabase RLS error without exposing sensitive DB details', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin', is_admin: true }, error: null }),
            }),
          }),
        };
      }
      if (table === 'responses') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  code: '42501',
                  message: 'new row violates row-level security policy for table "responses"',
                  details: 'policy ...',
                  hint: 'Check your RLS policy',
                },
              }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(responseService.dispatchResponse({ incidentId: 'inc-1', assignedTo: 'op-1' })).rejects.toThrow('Supabase permissions policy');
    await expect(responseService.dispatchResponse({ incidentId: 'inc-1', assignedTo: 'op-1' })).rejects.not.toThrow('policy ...');
  });
});
