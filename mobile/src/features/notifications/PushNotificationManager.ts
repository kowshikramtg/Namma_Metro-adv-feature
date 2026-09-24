/**
 * Push Notification Manager — Expo-compatible FCM/APNs push notifications.
 *
 * Architecture:
 *   - registerForPushNotificationsAsync(): Call once on app start.
 *     Returns the Expo push token, which should be sent to your backend
 *     to enable server-side push targeting.
 *   - scheduleLocalNotification(): Schedule an immediate local notification.
 *     Used to deliver journey/interchange alerts when the app is in the
 *     foreground AND when the WebSocket triggers an alert.
 *
 * Background behaviour:
 *   When the app is backgrounded or the screen is locked, OS-delivered
 *   remote pushes (via Expo Push API → FCM/APNs) will surface alerts.
 *   Local notifications scheduled via scheduleLocalNotification() also
 *   appear in the notification tray.
 *
 * Prerequisites (for remote push):
 *   1. Run `eas init` and replace `your-eas-project-id` in app.json.
 *   2. For Android: add google-services.json (from Firebase Console).
 *   3. For iOS: configure Push Notifications entitlement in Apple Developer.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ── Foreground notification behaviour ──
// Show alert + play sound even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and obtain the Expo push token.
 * Call this once at app startup (e.g. in App.tsx useEffect).
 *
 * @returns Expo push token string, or undefined if permission denied / simulator.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Device.isDevice) {
    console.warn('[PushNotifications] Must use a physical device for remote push notifications.');
    return undefined;
  }

  // Android: create a notification channel (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('journey-alerts', {
      name: 'Journey Alerts',
      description: 'Real-time alerts for metro journey events: interchanges, arrivals, departures.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B2D8E',
      sound: 'default',
    });
  }

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PushNotifications] Permission not granted for push notifications.');
    return undefined;
  }

  // Read projectId from app.json extra.eas.projectId (set via `eas init`)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      '[PushNotifications] No EAS projectId found in app.json extra.eas.projectId. ' +
      'Run `eas init` and update app.json to enable remote push notifications.',
    );
    return undefined;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[PushNotifications] Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error('[PushNotifications] Failed to get push token:', err);
    return undefined;
  }
}

/**
 * Schedule an immediate local notification.
 * Works in foreground, background, and when screen is locked.
 *
 * @param title   - Notification title shown in the OS tray
 * @param body    - Notification body text
 * @param data    - Optional payload (available in notification response handler)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
    },
    trigger: null, // null = fire immediately
  });
}

/**
 * Add a listener for notification responses (user taps a notification).
 * Returns the unsubscribe function — call it in a cleanup (useEffect return).
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}
