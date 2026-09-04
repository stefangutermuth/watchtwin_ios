import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Einheitlicher Swipe-Action-Button (v1.4-Redesign).
 *
 * Alle fünf Aktionen teilen exakt dieselbe Form: gleiche Größe, getönter
 * Ring, Icon in der Aktionsfarbe, Beschriftung darunter. Unterschieden wird
 * nur über die Farbe — und die ist identisch mit dem Swipe-Overlay der
 * jeweiligen Richtung (rot = links/Nope, grün = rechts/Like,
 * lila = hoch/Favorit, blau = runter/Gesehen). Zurück ist neutral grau.
 */
export type SwipeActionTone = 'neutral' | 'nope' | 'seen' | 'favorite' | 'like';

const TONE_CLASSES: Record<SwipeActionTone, { button: string; label: string }> = {
  neutral: {
    button: 'bg-white/5 text-gray-300 ring-gray-500/70 hover:ring-gray-400',
    label: 'text-gray-500',
  },
  nope: {
    button: 'bg-red-500/15 text-red-400 ring-red-500/70 hover:ring-red-400',
    label: 'text-red-400/80',
  },
  seen: {
    button: 'bg-blue-400/15 text-blue-300 ring-blue-400/70 hover:ring-blue-300',
    label: 'text-blue-300/80',
  },
  favorite: {
    button:
      'bg-wt-purple-light/20 text-violet-300 ring-wt-purple-light/80 hover:ring-violet-300',
    label: 'text-violet-300/80',
  },
  like: {
    button:
      'bg-emerald-500/15 text-emerald-400 ring-emerald-500/70 hover:ring-emerald-400',
    label: 'text-emerald-400/80',
  },
};

interface SwipeActionButtonProps {
  icon: IconDefinition;
  label: string;
  tone: SwipeActionTone;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function SwipeActionButton({
  icon,
  label,
  tone,
  onClick,
  disabled = false,
  ariaLabel,
}: SwipeActionButtonProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className="flex w-16 flex-col items-center gap-1.5 disabled:cursor-default"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full ring-[1.5px] transition-all ${
          disabled
            ? 'bg-white/5 text-gray-600 ring-white/10 opacity-40'
            : `${classes.button} hover:scale-110 active:scale-95`
        }`}
      >
        <FontAwesomeIcon icon={icon} className="text-xl" />
      </span>
      <span
        className={`text-[10px] font-medium leading-none tracking-wide ${
          disabled ? 'text-gray-600 opacity-60' : classes.label
        }`}
      >
        {label}
      </span>
    </button>
  );
}
