import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    ({ title, body, icon = '/pwa-192x192.svg', tag, requireInteraction = false }: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') {
        console.warn('Cannot send notification: permission not granted');
        return null;
      }

      try {
        const notification = new Notification(title, {
          body,
          icon,
          tag,
          requireInteraction,
          badge: '/pwa-192x192.svg',
        });

        // Auto-close after 5 seconds unless requireInteraction is true
        if (!requireInteraction) {
          setTimeout(() => notification.close(), 5000);
        }

        return notification;
      } catch (error) {
        console.error('Error sending notification:', error);
        return null;
      }
    },
    [isSupported, permission]
  );

  const notifyRelayChange = useCallback(
    (deviceName: string, newState: boolean) => {
      return sendNotification({
        title: `${deviceName || 'Device'} Relay ${newState ? 'ON' : 'OFF'}`,
        body: `The relay has been turned ${newState ? 'on' : 'off'}`,
        tag: 'relay-change',
      });
    },
    [sendNotification]
  );

  const notifyDeviceOffline = useCallback(
    (deviceName: string) => {
      return sendNotification({
        title: `${deviceName || 'Device'} Offline`,
        body: 'The device appears to be offline',
        tag: 'device-offline',
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  const notifyDeviceOnline = useCallback(
    (deviceName: string) => {
      return sendNotification({
        title: `${deviceName || 'Device'} Online`,
        body: 'The device is back online',
        tag: 'device-online',
      });
    },
    [sendNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyRelayChange,
    notifyDeviceOffline,
    notifyDeviceOnline,
  };
}
