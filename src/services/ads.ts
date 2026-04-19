import { Capacitor } from '@capacitor/core';
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import type { AdOptions } from '@capacitor-community/admob';

// AdMob Ad-Unit-IDs
const INTERSTITIAL_AD_ID = 'ca-app-pub-5931519454513162/9254008832';

let adsInitialized = false;

/** Prüft ob die App nativ läuft (iOS/Android) */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** AdMob initialisieren — nur auf nativen Geräten */
export async function initializeAds(): Promise<void> {
  if (!isNativePlatform()) {
    console.log('[Ads] Browser erkannt — AdMob übersprungen');
    return;
  }

  try {
    // 1. Auf iOS: ATT-Status abfragen / Prompt anzeigen (vor AdMob.initialize!)
    //    Bei "authorized" → personalisierte Werbung erlaubt.
    //    Bei "denied/restricted/notDetermined" → AdMob liefert nicht-personalisierte Werbung.
    if (Capacitor.getPlatform() === 'ios') {
      try {
        const status = await AdMob.trackingAuthorizationStatus();
        if (status.status === 'notDetermined') {
          // ATT-Dialog erst nach kurzer Verzögerung anzeigen,
          // damit die App schon sichtbar ist (Apple-Empfehlung)
          await new Promise((r) => setTimeout(r, 800));
          await AdMob.requestTrackingAuthorization();
        }
      } catch (err) {
        console.warn('[Ads] ATT-Abfrage fehlgeschlagen:', err);
      }
    }

    // 2. AdMob initialisieren
    await AdMob.initialize({
      initializeForTesting: false,
    });
    adsInitialized = true;
    console.log('[Ads] AdMob initialisiert');
  } catch (err) {
    console.error('[Ads] AdMob init fehlgeschlagen:', err);
  }
}

/** Interstitial-Ad vorbereiten (im Hintergrund laden) */
export async function prepareInterstitial(): Promise<void> {
  if (!adsInitialized) return;

  try {
    const options: AdOptions = {
      adId: INTERSTITIAL_AD_ID,
      isTesting: false,
    };
    await AdMob.prepareInterstitial(options);
  } catch (err) {
    console.error('[Ads] Interstitial vorbereiten fehlgeschlagen:', err);
  }
}

/**
 * Zeigt eine Interstitial-Werbung.
 * Gibt true zurück wenn die Ad gezeigt wurde, false wenn nicht (Browser, Fehler, etc.)
 */
export async function showInterstitial(): Promise<boolean> {
  if (!isNativePlatform() || !adsInitialized) {
    return false; // Browser — Fallback auf Platzhalter-Overlay
  }

  try {
    // Erst vorbereiten, dann anzeigen
    await prepareInterstitial();
    await AdMob.showInterstitial();
    return true;
  } catch (err) {
    console.error('[Ads] Interstitial anzeigen fehlgeschlagen:', err);
    return false;
  }
}

/** Event-Listener für Ad-Events (optional, für Analytics) */
export function setupAdListeners(callbacks?: {
  onAdLoaded?: () => void;
  onAdDismissed?: () => void;
  onAdFailed?: (error: unknown) => void;
}): void {
  if (!isNativePlatform()) return;

  if (callbacks?.onAdLoaded) {
    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      callbacks.onAdLoaded?.();
    });
  }

  if (callbacks?.onAdDismissed) {
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      callbacks.onAdDismissed?.();
    });
  }

  if (callbacks?.onAdFailed) {
    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
      callbacks.onAdFailed?.(err);
    });
  }
}
