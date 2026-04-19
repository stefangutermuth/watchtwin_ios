import { Capacitor } from '@capacitor/core';

/**
 * Crashlytics-Wrapper.
 * Nutzt Firebase Crashlytics auf nativen Plattformen (iOS/Android).
 * Im Browser werden Fehler nur in der Console geloggt.
 */

async function getCrashlytics() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { FirebaseCrashlytics } = await import('@capacitor-firebase/crashlytics');
    return FirebaseCrashlytics;
  } catch {
    return null;
  }
}

/**
 * Aktiviert Crashlytics-Collection (standardmäßig deaktiviert auf iOS).
 * Sollte beim App-Start aufgerufen werden.
 */
export async function initializeCrashReporting(): Promise<void> {
  const crashlytics = await getCrashlytics();
  if (!crashlytics) return;
  try {
    await crashlytics.setEnabled({ enabled: true });
    console.log('[Crashlytics] aktiviert');
  } catch (err) {
    console.warn('[Crashlytics] Init fehlgeschlagen:', err);
  }
}

/**
 * Loggt einen nicht-fatalen Fehler nach Crashlytics.
 * Bei fatalen React-Render-Fehlern automatisch aus der ErrorBoundary.
 */
export async function reportError(error: Error, context?: string): Promise<void> {
  console.error('[Crash]', context || 'error:', error);

  const crashlytics = await getCrashlytics();
  if (!crashlytics) return;

  try {
    if (context) {
      await crashlytics.log({ message: context });
    }
    await crashlytics.recordException({ message: error.message, stacktrace: error.stack ? parseStack(error.stack) : [] });
  } catch (err) {
    console.warn('[Crashlytics] recordException fehlgeschlagen:', err);
  }
}

/**
 * Setzt die User-ID für Crash-Zuordnung.
 */
export async function setCrashReportingUser(uid: string | null): Promise<void> {
  const crashlytics = await getCrashlytics();
  if (!crashlytics) return;
  try {
    if (uid) {
      await crashlytics.setUserId({ userId: uid });
    }
  } catch (err) {
    console.warn('[Crashlytics] setUserId fehlgeschlagen:', err);
  }
}

/**
 * Loggt eine Textnachricht (Breadcrumb) — hilft bei späterer Fehler-Analyse.
 */
export async function logBreadcrumb(message: string): Promise<void> {
  const crashlytics = await getCrashlytics();
  if (!crashlytics) return;
  try {
    await crashlytics.log({ message });
  } catch {
    // ignore
  }
}

// ── Helpers ──────────────────────────────────────────────────

interface StackFrame {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  methodName?: string;
}

/**
 * Parst einen JS-Stack-Trace in das Format, das Crashlytics erwartet.
 */
function parseStack(stack: string): StackFrame[] {
  return stack
    .split('\n')
    .slice(1) // erste Zeile ist "Error: message"
    .map((line) => {
      // Format: "    at functionName (file.js:123:45)"
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          methodName: match[1],
          fileName: match[2],
          lineNumber: Number(match[3]),
          columnNumber: Number(match[4]),
        };
      }
      return { methodName: line.trim() };
    });
}
