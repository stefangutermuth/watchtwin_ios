import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../services/crashReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Fängt React-Render-Fehler ab und zeigt einen Fallback-UI statt einem weißen Screen.
 * Funktioniert nur für Fehler im Render-Zyklus — nicht für async Promises oder Event Handler.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
    // An Firebase Crashlytics schicken (nativ) / Console (Web)
    reportError(error, `React render error — componentStack: ${info.componentStack ?? 'unknown'}`);
  }

  handleReload = () => {
    // Versuchen den State zurückzusetzen — falls Fehler weiter besteht, reload
    this.setState({ hasError: false, error: null });
    // Kurzer Delay, damit der neue State rendert bevor wir evtl. reloaden
    setTimeout(() => {
      if (this.state.hasError) window.location.reload();
    }, 100);
  };

  handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center bg-wt-dark px-6 text-center">
        <span className="text-6xl">🍿</span>
        <h1 className="mt-4 text-2xl font-bold text-white">
          Hoppla!
        </h1>
        <p className="mt-2 max-w-xs text-sm text-gray-400">
          Etwas ist schiefgelaufen. Keine Sorge — deine Daten sind sicher.
        </p>
        {this.state.error?.message && (
          <details className="mt-4 max-w-xs">
            <summary className="cursor-pointer text-xs text-gray-500">
              Technische Details
            </summary>
            <p className="mt-2 overflow-x-auto rounded-lg bg-wt-card p-3 text-left text-[11px] text-gray-400">
              {this.state.error.message}
            </p>
          </details>
        )}
        <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={this.handleReload}
            className="w-full rounded-xl bg-wt-pink py-3 text-sm font-bold text-white transition-all active:scale-95"
          >
            Nochmal versuchen
          </button>
          <button
            onClick={this.handleHardReload}
            className="w-full rounded-xl bg-wt-surface py-3 text-sm font-medium text-gray-300 transition-all active:scale-95"
          >
            App neu laden
          </button>
        </div>
      </div>
    );
  }
}
