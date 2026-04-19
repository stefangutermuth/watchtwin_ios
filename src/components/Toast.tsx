import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faCircleExclamation,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss nach 2.5 Sekunden
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast-Container — fixed oben, zentriert */}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const icon =
    toast.type === 'success'
      ? faCheck
      : toast.type === 'error'
        ? faCircleExclamation
        : faCircleInfo;

  const iconColor =
    toast.type === 'success'
      ? 'text-green-400'
      : toast.type === 'error'
        ? 'text-red-400'
        : 'text-sky-400';

  return (
    <motion.div
      className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-wt-card px-4 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
      initial={{ y: -40, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -20, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 400 }}
    >
      <FontAwesomeIcon icon={icon} className={`text-sm ${iconColor}`} />
      <span className="text-sm font-medium text-white">{toast.message}</span>
    </motion.div>
  );
}
