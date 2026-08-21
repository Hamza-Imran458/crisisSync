import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

// Set up the foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  notifyResponseDispatch: async (payload: {
    incidentId: string;
    responseId: string;
    incidentTitle: string;
    severity?: string;
    location?: string;
    operatorName?: string;
  }) => {
    const title = `Response assigned: ${payload.incidentTitle || 'Incident'}`;
    const body = `${payload.severity || 'General'} incident${payload.location ? ` • ${payload.location}` : ''}${payload.operatorName ? ` • Assigned to ${payload.operatorName}` : ''}`;

    await notificationService.sendLocalPush({
      title,
      body,
      data: {
        type: 'response_assignment',
        incidentId: payload.incidentId,
        responseId: payload.responseId,
        incidentTitle: payload.incidentTitle,
        severity: payload.severity,
        location: payload.location,
        operatorName: payload.operatorName,
      },
    });
  },

  /**
   * Initializes notification services (e.g. asking for permissions)
   */
  init: async (): Promise<boolean> => {
    logger.info('notificationService: Initializing notifications infrastructure');
    
    if (Platform.OS === 'web') {
      logger.info('notificationService: Push notifications are not supported on web.');
      return false;
    }

    if (!Device.isDevice) {
      logger.warn('notificationService: Must use physical device for Push Notifications');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        logger.warn('notificationService: Failed to get push token for push notification!');
        return false;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      return true;
    } catch (error) {
      logger.error('notificationService: Error initializing notifications', error);
      return false;
    }
  },

  /**
   * Sends a local push notification
   */
  sendLocalPush: async (payload: NotificationPayload) => {
    logger.info('notificationService: Sending local push', payload);
    
    if (Platform.OS === 'web') return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
        },
        trigger: null, // trigger immediately
      });
    } catch (error) {
      logger.error('notificationService: Error sending local push', error);
    }
  },

  /**
   * Abstracted in-app notification for displaying snackbars or banners
   */
  showInApp: (payload: NotificationPayload) => {
    logger.info('notificationService: Showing in-app notification', payload);
    // In a real app, this might trigger a Toast or Snackbar context.
    // For now, we will fallback to local push if we are backgrounded, or let the UI handle it.
  },

  /**
   * SMS fallback capability for critical alerts
   */
  sendSmsFallback: async (phoneNumber: string, message: string) => {
    logger.info('notificationService: Triggering SMS fallback to', phoneNumber, 'message:', message);
    // Abstracted: integrate with backend SMS service or Twilio
  }
};
