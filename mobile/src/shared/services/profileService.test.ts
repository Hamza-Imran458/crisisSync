import { profileService } from './profileService';
import { supabase, getCurrentSession } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
  getCurrentSession: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('profileService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUserProfile', () => {
    it('returns null if no session exists', async () => {
      (getCurrentSession as jest.Mock).mockResolvedValueOnce(null);
      const result = await profileService.fetchUserProfile();
      expect(result).toBeNull();
    });

    it('fetches and normalizes the profile successfully', async () => {
      (getCurrentSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockData = {
        full_name: 'Test User',
        notification_radius_km: 10,
        alerts_enabled: false,
        sms_backup_enabled: true,
      };

      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);
      mockFrom.mockImplementationOnce(() => ({ select: mockSelect }));
      mockSelect.mockImplementationOnce(() => ({ eq: mockEq }));
      mockEq.mockImplementationOnce(() => ({ maybeSingle: mockMaybeSingle }));

      const result = await profileService.fetchUserProfile();

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
      expect(result).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        notificationRadiusKm: 10,
        alertsEnabled: false,
        smsBackupEnabled: true,
      });
    });
  });

  describe('updateUserProfile', () => {
    it('updates the profile and returns the normalized result', async () => {
      (getCurrentSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockData = {
        full_name: 'New Name',
        notification_radius_km: 5,
        alerts_enabled: true,
        sms_backup_enabled: false,
      };

      const mockFrom = jest.fn().mockReturnThis();
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);
      mockFrom.mockImplementationOnce(() => ({ update: mockUpdate }));
      mockUpdate.mockImplementationOnce(() => ({ eq: mockEq }));
      mockEq.mockImplementationOnce(() => ({ select: mockSelect }));
      mockSelect.mockImplementationOnce(() => ({ maybeSingle: mockMaybeSingle }));

      const updates = { name: 'New Name', notificationRadiusKm: 5 };
      const result = await profileService.updateUserProfile(updates);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        full_name: 'New Name',
        notification_radius_km: 5,
      }));
      
      expect(result?.name).toBe('New Name');
      expect(result?.notificationRadiusKm).toBe(5);
    });
  });
});
