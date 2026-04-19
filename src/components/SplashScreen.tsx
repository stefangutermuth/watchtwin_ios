import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  durationMs?: number;
}

// Fluffy popped kernel — cluster of cream/white blobs
function PopcornKernel({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <g fill="#fffde7" stroke="#f5e6a8" strokeWidth="0.5">
        <circle cx="14" cy="14" r="7.5" />
        <circle cx="25" cy="13" r="6.5" />
        <circle cx="20" cy="22" r="8.5" />
        <circle cx="12" cy="26" r="6.5" />
        <circle cx="28" cy="25" r="6" />
      </g>
      <g fill="#fff9c4" opacity="0.8">
        <circle cx="14" cy="13" r="2.5" />
        <circle cx="25" cy="12" r="2" />
        <circle cx="21" cy="21" r="2.5" />
      </g>
      <g fill="#fbc02d" opacity="0.35">
        <circle cx="18" cy="28" r="1.5" />
        <circle cx="27" cy="28" r="1.2" />
      </g>
    </svg>
  );
}

// Deterministic "random" offsets for each kernel so layout is stable
const KERNELS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  angleDeg: (i / 14) * 360 + (i % 3) * 7,
  distance: 140 + (i % 4) * 30,
  delay: (i * 0.07) % 1,
  size: 28 + (i % 5) * 4,
  spin: (i % 2 === 0 ? 1 : -1) * (180 + (i % 4) * 90),
}));

export function SplashScreen({ onComplete, durationMs = 2600 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // match exit-animation duration
      setTimeout(() => onComplete?.(), 500);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-wt-dark"
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Radial brand glow */}
          <motion.div
            className="absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-wt-purple/40 via-wt-pink/30 to-transparent blur-3xl"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Popcorn bucket */}
          <motion.div
            className="absolute bottom-[30%] z-[2]"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <div className="relative">
              {/* Bucket body — red+white stripes like a cinema bucket */}
              <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
                <defs>
                  <pattern
                    id="stripes"
                    x="0"
                    y="0"
                    width="20"
                    height="100"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="10" height="100" fill="#f11885" />
                    <rect x="10" width="10" height="100" fill="#ffffff" />
                  </pattern>
                </defs>
                {/* Trapezoid bucket */}
                <path
                  d="M 10 10 L 110 10 L 100 95 Q 60 102 20 95 Z"
                  fill="url(#stripes)"
                  stroke="#f74da5"
                  strokeWidth="2"
                />
                {/* Top rim */}
                <ellipse cx="60" cy="10" rx="50" ry="6" fill="#242040" />
                <ellipse cx="60" cy="8" rx="50" ry="4" fill="#1a1730" />
              </svg>
            </div>
          </motion.div>

          {/* Popcorn kernels flying out */}
          {KERNELS.map((k) => {
            const rad = (k.angleDeg * Math.PI) / 180;
            const targetX = Math.cos(rad) * k.distance;
            const targetY = Math.sin(rad) * k.distance - 80;
            return (
              <motion.div
                key={k.id}
                className="absolute z-[3] select-none drop-shadow-md"
                initial={{ x: 0, y: 40, opacity: 0, rotate: 0, scale: 0 }}
                animate={{
                  x: [0, targetX * 0.6, targetX],
                  y: [40, targetY * 0.7, targetY + 220],
                  opacity: [0, 1, 1, 0],
                  rotate: [0, k.spin * 0.6, k.spin],
                  scale: [0, 1.1, 1, 0.9],
                }}
                transition={{
                  duration: 1.8,
                  delay: 0.35 + k.delay,
                  times: [0, 0.25, 0.7, 1],
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                <PopcornKernel size={k.size} />
              </motion.div>
            );
          })}

          {/* WatchTwin logo + wordmark */}
          <motion.div
            className="relative z-[4] flex flex-col items-center"
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.2, type: 'spring', stiffness: 180 }}
          >
            <motion.img
              src="/logo.png"
              alt="WatchTwin"
              className="h-20 drop-shadow-2xl"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 1.4,
                delay: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.p
              className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.5 }}
            >
              Swipe deinen nächsten Film
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
