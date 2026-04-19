import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Handhabt Custom URL Scheme: watchtwin://invite/ABCD12
 *
 * Unterstützte Routes:
 *   watchtwin://invite/{CODE}           → /friends?code={CODE}
 *   watchtwin://party/{PARTY_ID}        → /party/{PARTY_ID}
 *
 * Im Browser zusätzlich: Query-Param ?invite=CODE auf / wird auch verarbeitet,
 * damit Web-Sharing funktioniert.
 */
export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    // Native: Auf Custom-URL-Open hören
    if (Capacitor.isNativePlatform()) {
      let unsub: (() => void) | null = null;
      (async () => {
        try {
          const { App } = await import('@capacitor/app');
          const handle = await App.addListener('appUrlOpen', ({ url }) => {
            handleUrl(url, navigate);
          });
          unsub = () => handle.remove();
        } catch (err) {
          console.warn('[DeepLinks] App plugin nicht verfügbar:', err);
        }
      })();
      return () => {
        if (unsub) unsub();
      };
    }

    // Browser: initiale URL-Params prüfen
    const url = new URL(window.location.href);
    const inviteCode = url.searchParams.get('invite');
    if (inviteCode) {
      navigate(`/friends?code=${encodeURIComponent(inviteCode)}`, { replace: true });
    }
  }, [navigate]);
}

function handleUrl(url: string, navigate: (path: string) => void) {
  try {
    const parsed = new URL(url);
    // Format: watchtwin://invite/ABCD12 → parsed.host = 'invite', pathname = '/ABCD12'
    const host = parsed.host;
    const segment = parsed.pathname.replace(/^\//, '');

    if (host === 'invite' && segment) {
      navigate(`/friends?code=${encodeURIComponent(segment)}`);
    } else if (host === 'party' && segment) {
      navigate(`/party/${encodeURIComponent(segment)}`);
    } else {
      console.log('[DeepLinks] Unbekannter Link:', url);
    }
  } catch (err) {
    console.warn('[DeepLinks] URL-Parsing fehlgeschlagen:', err);
  }
}
