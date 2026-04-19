import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faTimes } from '@fortawesome/free-solid-svg-icons';
import { showInterstitial, isNativePlatform } from '../services/ads';
import { purchasePremium } from '../services/purchases';

interface AdOverlayProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function AdOverlay({ visible, onClose, onUpgrade }: AdOverlayProps) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [purchaseMessage, setPurchaseMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      setCanSkip(false);
      setShowPlaceholder(true);
      setPurchaseMessage('');
      return;
    }

    // Auf nativem Gerät: echte AdMob-Werbung zeigen
    if (isNativePlatform()) {
      showInterstitial().then((shown) => {
        if (shown) {
          // Echte Ad wurde gezeigt — Overlay direkt schließen
          onClose();
          setShowPlaceholder(false);
        }
        // Wenn nicht gezeigt: Fallback auf Platzhalter
      });
    }

    // Countdown-Timer (für Platzhalter oder wenn AdMob fehlschlägt)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, onClose]);

  async function handleUpgrade() {
    setPurchaseMessage('');
    const result = await purchasePremium();
    if (result.success) {
      onUpgrade();
    } else if (result.message) {
      setPurchaseMessage(result.message);
    }
  }

  // Nicht rendern wenn native Ad erfolgreich gezeigt wurde
  if (!showPlaceholder && isNativePlatform()) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className="flex flex-col items-center justify-center bg-black"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Skip button */}
          <div className="absolute right-4" style={{ top: 'calc(3rem + env(safe-area-inset-top))' }}>
            {canSkip ? (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-full bg-wt-surface px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-wt-surface"
              >
                Überspringen
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wt-surface text-sm font-bold text-gray-400">
                {countdown}
              </div>
            )}
          </div>

          {/* Placeholder ad content */}
          <div className="flex flex-col items-center px-8 text-center">
            {/* Fake ad area */}
            <div className="mb-8 flex h-64 w-full max-w-sm items-center justify-center rounded-2xl border-2 border-dashed border-wt-surface bg-wt-card">
              <div className="text-center">
                <p className="text-4xl">📺</p>
                <p className="mt-3 text-lg font-bold text-gray-400">
                  Werbung
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {isNativePlatform()
                    ? 'Ad wird geladen...'
                    : 'Hier erscheint später eine Anzeige'}
                </p>
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-wt-purple/20 to-wt-pink/20 p-5">
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon
                  icon={faCrown}
                  className="text-xl text-wt-purple-light"
                />
                <h3 className="text-lg font-bold text-white">
                  WatchTwin Premium
                </h3>
              </div>
              <p className="mt-2 text-sm text-gray-300">
                Keine Werbung, unbegrenzte Watchlist und alle Filter.
              </p>
              {purchaseMessage && (
                <p className="mt-2 text-sm text-wt-purple-light">{purchaseMessage}</p>
              )}
              <button
                onClick={handleUpgrade}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
              >
                Jetzt freischalten — 4,99 €
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
