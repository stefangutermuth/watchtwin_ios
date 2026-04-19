import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Leichtes Tap-Feedback (Swipe links/rechts, Button-Tap) */
export async function hapticLight(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // ignore
  }
}

/** Mittleres Feedback (Like/Superlike) */
export async function hapticMedium(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // ignore
  }
}

/** Starkes Feedback (Match / wichtige Aktion) */
export async function hapticHeavy(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // ignore
  }
}

/** Erfolgs-Notification (Match!) */
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // ignore
  }
}

/** Warnung (Undo) */
export async function hapticWarning(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // ignore
  }
}
