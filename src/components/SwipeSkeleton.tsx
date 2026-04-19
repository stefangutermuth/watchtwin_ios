import { motion } from 'framer-motion';

// Fluffy popped kernel — cluster of cream/white blobs
function PopcornKernel({ size = 24 }: { size?: number }) {
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
    </svg>
  );
}

// 8 kernels, looping
const KERNELS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  angleDeg: -90 + (i - 3.5) * 22, // fan upward, roughly -170° to -10°
  distance: 70 + (i % 3) * 15,
  delay: (i * 0.18) % 1.4,
  size: 18 + (i % 3) * 4,
  spin: (i % 2 === 0 ? 1 : -1) * 180,
}));

export function SwipeSkeleton() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Stacked skeleton cards */}
      <div className="absolute h-full w-full max-w-sm scale-[0.92] rounded-3xl bg-wt-card/60" />
      <div className="absolute h-full w-full max-w-sm scale-[0.96] rounded-3xl bg-wt-card/80" />
      <div className="relative h-full w-full max-w-sm overflow-hidden rounded-3xl bg-wt-card shadow-xl">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        {/* Placeholder badges */}
        <div className="absolute left-3 top-3 h-5 w-12 rounded-full bg-wt-surface" />
        <div className="absolute right-3 top-3 h-5 w-14 rounded-full bg-wt-surface" />

        {/* Popcorn-Bucket + fliegende Kernels */}
        <div className="relative flex h-full flex-col items-center justify-center gap-4">
          <div className="relative flex h-40 w-40 items-end justify-center">
            {/* Fliegende Popcorn-Kernels — loop */}
            {KERNELS.map((k) => {
              const rad = (k.angleDeg * Math.PI) / 180;
              const targetX = Math.cos(rad) * k.distance;
              const targetY = Math.sin(rad) * k.distance;
              return (
                <motion.div
                  key={k.id}
                  className="absolute bottom-10 left-1/2 z-[2] -translate-x-1/2 drop-shadow"
                  initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0 }}
                  animate={{
                    x: [0, targetX * 0.6, targetX],
                    y: [0, targetY, targetY + 60],
                    opacity: [0, 1, 1, 0],
                    rotate: [0, k.spin * 0.6, k.spin],
                    scale: [0, 1.1, 1, 0.8],
                  }}
                  transition={{
                    duration: 1.8,
                    delay: k.delay,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    times: [0, 0.3, 0.7, 1],
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <PopcornKernel size={k.size} />
                </motion.div>
              );
            })}

            {/* Popcorn Bucket */}
            <motion.div
              className="relative z-[1]"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="80" height="70" viewBox="0 0 120 100" fill="none">
                <defs>
                  <pattern
                    id="skeleton-stripes"
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
                <path
                  d="M 10 10 L 110 10 L 100 95 Q 60 102 20 95 Z"
                  fill="url(#skeleton-stripes)"
                  stroke="#f74da5"
                  strokeWidth="2"
                />
                <ellipse cx="60" cy="10" rx="50" ry="6" fill="#242040" />
                <ellipse cx="60" cy="8" rx="50" ry="4" fill="#1a1730" />
              </svg>
            </motion.div>
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
            Suche Filme für dich…
          </p>
          <div className="flex gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-wt-pink" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-wt-pink" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-wt-pink" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Bottom info placeholders */}
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <div className="h-4 w-3/4 rounded bg-wt-surface" />
          <div className="flex gap-2">
            <div className="h-3 w-10 rounded bg-wt-surface/70" />
            <div className="h-3 w-14 rounded bg-wt-surface/70" />
            <div className="h-3 w-12 rounded bg-wt-surface/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
