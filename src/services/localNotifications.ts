import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

const CHANNEL_ID = 'reminders';

export interface NotificationSettings {
  weekendEnabled: boolean;
  sundayEnabled: boolean;
  watchlistEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  weekendEnabled: true,
  sundayEnabled: true,
  watchlistEnabled: true,
};

const REMINDER_IDS = {
  WEEKEND: 1001,
  SUNDAY: 1002,
  WATCHLIST: 1003,
} as const;

/**
 * Channel für Android registrieren + initialen Permission-Status prüfen.
 * Idempotent (mehrfach aufrufbar).
 */
export async function initializeNotifications(): Promise<void> {
  if (!isNative()) return;
  try {
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'WatchTwin Erinnerungen',
        description: 'Wochenend- und Watchlist-Erinnerungen',
        importance: 4,
        visibility: 1,
        lights: true,
        vibration: true,
      });
    }
  } catch (err) {
    console.warn('[Notifications] Channel-Setup fehlgeschlagen:', err);
  }
}

/**
 * Berechtigung anfragen (Apple-Dialog auf iOS, Runtime-Permission auf Android 13+).
 * Gibt true zurück, wenn erlaubt.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (err) {
    console.warn('[Notifications] Permission-Request fehlgeschlagen:', err);
    return false;
  }
}

/**
 * Alle bestehenden Erinnerungs-Notifications abbrechen.
 */
export async function cancelAllReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: Object.values(REMINDER_IDS).map((id) => ({ id })),
    });
  } catch (err) {
    console.warn('[Notifications] Cancel fehlgeschlagen:', err);
  }
}

/**
 * Schedule alle eingeschalteten Reminder neu (idempotent — cancelt vorher).
 *
 * @param settings  User-Einstellungen
 * @param watchlistCount  Anzahl Filme auf der Watchlist (für Reminder 1003)
 */
export async function scheduleAllReminders(
  settings: NotificationSettings,
  watchlistCount: number
): Promise<void> {
  if (!isNative()) return;

  // Sicherstellen: erst Permission
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Alte canceln
  await cancelAllReminders();

  const toSchedule: ScheduleOptions['notifications'] = [];

  if (settings.weekendEnabled) {
    toSchedule.push({
      id: REMINDER_IDS.WEEKEND,
      title: '🍿 Wochenende!',
      body: 'Schon entschieden was ihr schaut? Swipe los.',
      channelId: CHANNEL_ID,
      // Capacitor: weekday ist 1–7, wobei 1 = Sonntag (iOS-Style)
      schedule: { on: { weekday: 6, hour: 17, minute: 0 }, allowWhileIdle: true },
    });
  }

  if (settings.sundayEnabled) {
    toSchedule.push({
      id: REMINDER_IDS.SUNDAY,
      title: '🎬 Filmabend?',
      body: 'Dein nächster Lieblingsfilm wartet auf einen Swipe.',
      channelId: CHANNEL_ID,
      schedule: { on: { weekday: 1, hour: 19, minute: 0 }, allowWhileIdle: true },
    });
  }

  if (settings.watchlistEnabled && watchlistCount > 3) {
    toSchedule.push({
      id: REMINDER_IDS.WATCHLIST,
      title: '💔 Watchlist wartet',
      body: `Du hast ${watchlistCount} Filme auf deiner Watchlist — Zeit für einen davon?`,
      channelId: CHANNEL_ID,
      // Montag 18:00 (weekday=2 in iOS-Convention)
      schedule: { on: { weekday: 2, hour: 18, minute: 0 }, allowWhileIdle: true },
    });
  }

  if (toSchedule.length === 0) return;

  try {
    await LocalNotifications.schedule({ notifications: toSchedule });
  } catch (err) {
    console.warn('[Notifications] Schedule fehlgeschlagen:', err);
  }
}

/**
 * Convenience: nur prüfen ob bereits erlaubt (kein Dialog).
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
}
