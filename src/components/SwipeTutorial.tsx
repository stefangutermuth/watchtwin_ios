import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faHeart,
  faStar,
  faEye,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faArrowDown,
} from '@fortawesome/free-solid-svg-icons';

interface Props {
  compact?: boolean;
}

/**
 * Erklärt die 4 Swipe-Richtungen. Wird sowohl im Onboarding-Step 2
 * als auch im Help-Modal auf der SwipePage verwendet.
 */
export function SwipeTutorial({ compact = false }: Props) {
  return (
    <div className="flex flex-col items-center">
      {/* Demo-Karte mit animierten Pfeilen */}
      <div className={`relative ${compact ? 'h-44 w-32' : 'h-48 w-36'} my-3`}>
        {/* UP — Super Like */}
        <motion.div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0"
          animate={{ y: [-2, -6, -2] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="rounded-full bg-gradient-to-br from-wt-purple to-wt-pink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg shadow-wt-pink/40">
            <FontAwesomeIcon icon={faStar} className="mr-0.5 text-[8px]" />
            Top
          </span>
          <FontAwesomeIcon icon={faArrowUp} className="text-[10px] text-wt-pink" />
        </motion.div>

        {/* LEFT — Nope */}
        <motion.div
          className="absolute top-1/2 -left-1.5 -translate-y-1/2 -translate-x-full flex items-center gap-0.5"
          animate={{ x: [0, -5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <span className="rounded-full bg-wt-card px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500 ring-1 ring-red-500/40 shadow-md">
            <FontAwesomeIcon icon={faXmark} className="mr-0.5" />
            Nope
          </span>
          <FontAwesomeIcon icon={faArrowLeft} className="text-[10px] text-red-500" />
        </motion.div>

        {/* RIGHT — Like */}
        <motion.div
          className="absolute top-1/2 -right-1.5 -translate-y-1/2 translate-x-full flex items-center gap-0.5"
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          <FontAwesomeIcon icon={faArrowRight} className="text-[10px] text-emerald-400" />
          <span className="rounded-full bg-gradient-to-br from-green-400 to-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-500/40">
            <FontAwesomeIcon icon={faHeart} className="mr-0.5" />
            Like
          </span>
        </motion.div>

        {/* DOWN — Gesehen */}
        <motion.div
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0"
          animate={{ y: [2, 6, 2] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        >
          <FontAwesomeIcon icon={faArrowDown} className="text-[10px] text-sky-400" />
          <span className="rounded-full bg-wt-card px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-400 ring-1 ring-sky-400/40 shadow-md">
            <FontAwesomeIcon icon={faEye} className="mr-0.5" />
            Gesehen
          </span>
        </motion.div>

        {/* Mock card */}
        <motion.div
          className="relative h-full w-full rounded-2xl bg-gradient-to-br from-wt-purple/50 via-wt-card to-wt-pink/40 p-2 shadow-2xl"
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex h-full w-full flex-col items-center justify-end rounded-xl bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-[11px] font-bold text-white drop-shadow">Dein nächster</p>
            <p className="text-[11px] font-bold text-white drop-shadow">Lieblingsfilm 🎬</p>
          </div>
        </motion.div>
      </div>

      {/* Legende — 2x2 Grid */}
      <div className="mt-4 w-full grid grid-cols-2 gap-2">
        <LegendCell
          icon={faHeart}
          color="text-emerald-400"
          ringColor="ring-emerald-400/30"
          direction="→ Rechts"
          label="Like"
        />
        <LegendCell
          icon={faXmark}
          color="text-red-500"
          ringColor="ring-red-500/30"
          direction="← Links"
          label="Nope"
        />
        <LegendCell
          icon={faStar}
          color="text-wt-pink"
          ringColor="ring-wt-pink/30"
          direction="↑ Hoch"
          label="Top-Favorit"
        />
        <LegendCell
          icon={faEye}
          color="text-sky-400"
          ringColor="ring-sky-400/30"
          direction="↓ Runter"
          label="Gesehen"
        />
      </div>

      <p className="mt-3 text-center text-[11px] text-gray-500">
        Oder tippe die Buttons unter der Karte.
      </p>
    </div>
  );
}

function LegendCell({
  icon,
  color,
  ringColor,
  direction,
  label,
}: {
  icon: typeof faHeart;
  color: string;
  ringColor: string;
  direction: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-wt-card/60 p-2">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wt-surface ${color} ring-1 ${ringColor}`}
      >
        <FontAwesomeIcon icon={icon} className="text-xs" />
      </div>
      <div>
        <span className={`text-[10px] font-bold ${color}`}>{direction}</span>
        <p className="text-xs font-semibold text-white leading-tight">{label}</p>
      </div>
    </div>
  );
}
