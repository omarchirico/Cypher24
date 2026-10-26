/**
 * Cypher24 Notification Utility
 * Manages Browser System Notifications, Haptic Vibration, In-App Banners & Preferences
 */

export interface NotificationSettings {
  systemEnabled: boolean;
  soundEnabled: boolean;
  previewEnabled: boolean; // if false, displays 'Nuovo messaggio cifrato' for privacy
}

const SETTINGS_KEY = 'cypher24_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  systemEnabled: true,
  soundEnabled: true,
  previewEnabled: true,
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save notification settings:', err);
  }
}

export function getSystemNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestSystemNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export function triggerHapticFeedback(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {}
}

export function triggerSystemNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const settings = getNotificationSettings();
  if (!settings.systemEnabled) return;

  try {
    const notification = new Notification(options.title, {
      body: settings.previewEnabled ? options.body : 'Nuovo messaggio cifrato ricevuto',
      icon: options.icon || '/icon.svg',
      badge: '/icon.svg',
      tag: options.tag || 'cypher24_msg',
      silent: !settings.soundEnabled,
    });

    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        notification.close();
        options.onClick?.();
      };
    }
  } catch (err) {
    console.warn('Could not dispatch system notification:', err);
  }
}
