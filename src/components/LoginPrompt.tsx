import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBookmark, faCrown, faStar } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

interface LoginPromptProps {
  visible: boolean;
  onClose: () => void;
  reason?: 'watchlist' | 'premium' | 'favorite';
}

const reasonTexts = {
  watchlist: {
    icon: faBookmark,
    title: 'Film merken?',
    description: 'Erstelle ein kostenloses Konto, um Filme und Serien auf deiner Watchlist zu speichern.',
  },
  premium: {
    icon: faCrown,
    title: 'Premium freischalten',
    description: 'Melde dich an, um WatchTwin Premium zu kaufen und werbefrei zu swipen.',
  },
  favorite: {
    icon: faStar,
    title: 'Favorit speichern?',
    description: 'Erstelle ein kostenloses Konto, um deine Top-Favoriten zu speichern.',
  },
};

export function LoginPrompt({ visible, onClose, reason = 'watchlist' }: LoginPromptProps) {
  const navigate = useNavigate();
  const text = reasonTexts[reason];

  function handleLogin() {
    onClose();
    navigate('/auth');
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className="flex items-end justify-center bg-black/60 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483646 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-3xl bg-wt-card px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-500 hover:text-white"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wt-pink/20">
                <FontAwesomeIcon icon={text.icon} className="text-2xl text-wt-pink" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">{text.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{text.description}</p>

              <button
                onClick={handleLogin}
                className="mt-6 w-full rounded-xl bg-wt-pink py-3.5 text-base font-bold text-white transition-all hover:bg-wt-pink-light active:scale-[0.98]"
              >
                Kostenlos registrieren
              </button>
              <button
                onClick={onClose}
                className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-300"
              >
                Später
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
