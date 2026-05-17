// Hintergrund:
// WKWebView (iOS) und Android WebView cachen den JS-Bundle, Service-Worker-
// Registrierungen und Response-Caches sehr aggressiv. Nach einem App-Store-
// Update kann es passieren, dass die App zwar die neue Binary läuft, der
// WebView aber weiter den alten Bundle aus dem Cache lädt — d.h. Nutzer sehen
// keine Änderungen, bis sie die App löschen + neu installieren.
//
// Fix: Beim App-Start die native Version mit der zuletzt gesehenen vergleichen.
// Bei Versionswechsel werden alle WebView-Caches + Service-Worker geleert,
// damit der nächste Boot garantiert das frische Bundle benutzt.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const STORAGE_KEY = 'wt:lastAppVersion';

/**
 * Beim App-Boot aufrufen (vor React-Mount). Vergleicht native App-Version mit
 * dem letzten gespeicherten Wert und leert WebView-Caches bei Mismatch.
 *
 * Auf Web kein No-op: dort gibt's kein App-Update-Konzept, der Browser
 * managed seinen Cache selbst.
 */
export async function ensureFreshAfterAppUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const info = await App.getInfo();
    const currentVersion = `${info.version}-${info.build}`;
    const lastVersion = localStorage.getItem(STORAGE_KEY);

    if (lastVersion === currentVersion) return; // Kein Update — nichts tun

    // Erstinstallation oder neue Version → alle WebView-Caches leeren.
    await clearAllWebCaches();

    localStorage.setItem(STORAGE_KEY, currentVersion);

    // Bei Erstinstallation (lastVersion === null) NICHT reloaden — der erste
    // Boot lädt eh den frischen Bundle. Nur bei echtem Update reloaden, damit
    // sicher das neue Bundle aktiv wird.
    if (lastVersion !== null && lastVersion !== currentVersion) {
      // Reload async, damit React kurz aufräumen kann.
      setTimeout(() => window.location.reload(), 100);
    }
  } catch (err) {
    // Niemals den App-Start crashen — Fehler nur loggen.
    console.warn('[versionCacheBust] failed:', err);
  }
}

async function clearAllWebCaches(): Promise<void> {
  // Cache API (Service-Worker-Caches, fetch-Caches)
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {
      console.warn('[versionCacheBust] caches.delete failed:', e);
    }
  }

  // Service-Worker-Registrierungen
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch (e) {
      console.warn('[versionCacheBust] sw.unregister failed:', e);
    }
  }
}
