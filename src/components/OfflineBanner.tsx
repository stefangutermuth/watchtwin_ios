import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi } from '@fortawesome/free-solid-svg-icons';

/**
 * Zeigt ein Banner wenn die App offline ist.
 * Verschwindet automatisch wenn wieder online.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-red-500/95 px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-white shadow-lg backdrop-blur-sm"
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          exit={{ y: -80 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        >
          <FontAwesomeIcon icon={faWifi} className="text-sm opacity-70" />
          <span className="text-sm font-medium">
            Keine Internetverbindung
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
