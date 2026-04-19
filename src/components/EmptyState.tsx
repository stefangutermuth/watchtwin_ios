import { motion } from 'framer-motion';
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Emoji oder FontAwesome-Icon für die Visual. Bei Emoji: String, bei Icon: Objekt. */
  icon?: FontAwesomeIconProps['icon'];
  emoji?: string;
  /** Akzent-Farbe des Icon-Kreises. Default: Pink */
  iconColor?: 'pink' | 'purple' | 'sky' | 'emerald' | 'amber';
  title: string;
  description: string;
  /** Primärer Call-to-Action */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Sekundärer Link darunter (z.B. "Überspringen") */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Kleiner Bonus-Content unter der Description (z.B. Stats, Tipps) */
  children?: ReactNode;
}

const colorClasses = {
  pink: {
    bg: 'bg-wt-pink/15',
    icon: 'text-wt-pink',
    glow: 'from-wt-pink/20',
  },
  purple: {
    bg: 'bg-wt-purple-light/15',
    icon: 'text-wt-purple-lighter',
    glow: 'from-wt-purple/20',
  },
  sky: {
    bg: 'bg-sky-400/15',
    icon: 'text-sky-400',
    glow: 'from-sky-500/20',
  },
  emerald: {
    bg: 'bg-emerald-400/15',
    icon: 'text-emerald-400',
    glow: 'from-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-400/15',
    icon: 'text-amber-400',
    glow: 'from-amber-500/20',
  },
};

export function EmptyState({
  icon,
  emoji,
  iconColor = 'pink',
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  const colors = colorClasses[iconColor];

  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Glow background behind icon */}
      <div className="relative">
        <div
          className={`absolute inset-0 -z-10 h-32 w-32 -translate-x-4 -translate-y-4 rounded-full bg-gradient-radial ${colors.glow} to-transparent blur-2xl`}
        />

        {/* Icon circle with gentle bounce */}
        <motion.div
          className={`flex h-24 w-24 items-center justify-center rounded-full ${colors.bg} ring-1 ring-white/10`}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emoji ? (
            <span className="text-5xl leading-none">{emoji}</span>
          ) : icon ? (
            <FontAwesomeIcon icon={icon} className={`text-4xl ${colors.icon}`} />
          ) : null}
        </motion.div>
      </div>

      <h2 className="mt-6 text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-400">
        {description}
      </p>

      {children && <div className="mt-4">{children}</div>}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink px-8 py-3 text-base font-bold text-white shadow-lg shadow-wt-pink/30 transition-all active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}

      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="mt-3 py-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          {secondaryAction.label}
        </button>
      )}
    </motion.div>
  );
}
