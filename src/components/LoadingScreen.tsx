import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

// Small popcorn kernel
function MiniKernel({ size = 18 }: { size?: number }) {
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
      </g>
    </svg>
  );
}

const POPS = [
  { id: 0, x: -30, y: -35, delay: 0, rot: -20, size: 16 },
  { id: 1, x: 0, y: -45, delay: 0.15, rot: 15, size: 18 },
  { id: 2, x: 28, y: -32, delay: 0.3, rot: 25, size: 15 },
  { id: 3, x: -18, y: -50, delay: 0.45, rot: -30, size: 14 },
  { id: 4, x: 20, y: -48, delay: 0.6, rot: 10, size: 17 },
];

export function LoadingScreen({ message = 'Laden...' }: LoadingScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-wt-dark">
      {/* Glow */}
      <div className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-wt-purple/20 via-wt-pink/15 to-transparent blur-3xl" />

      {/* Popcorn bucket + popping kernels */}
      <div className="relative mb-6">
        {/* Popping kernels */}
        {POPS.map((k) => (
          <motion.div
            key={k.id}
            className="absolute left-1/2 top-0 -translate-x-1/2"
            animate={{
              x: [0, k.x * 0.5, k.x],
              y: [0, k.y, k.y + 15],
              opacity: [0, 1, 1, 0],
              rotate: [0, k.rot],
              scale: [0, 1.1, 1, 0.7],
            }}
            transition={{
              duration: 1.4,
              delay: k.delay,
              repeat: Infinity,
              repeatDelay: 0.4,
              times: [0, 0.3, 0.7, 1],
              ease: 'easeOut',
            }}
          >
            <MiniKernel size={k.size} />
          </motion.div>
        ))}

        {/* Mini bucket */}
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="64" height="56" viewBox="0 0 120 100" fill="none">
            <defs>
              <pattern id="ls" x="0" y="0" width="20" height="100" patternUnits="userSpaceOnUse">
                <rect width="10" height="100" fill="#f11885" />
                <rect x="10" width="10" height="100" fill="#ffffff" />
              </pattern>
            </defs>
            <path d="M 10 10 L 110 10 L 100 95 Q 60 102 20 95 Z" fill="url(#ls)" stroke="#f74da5" strokeWidth="2" />
            <ellipse cx="60" cy="10" rx="50" ry="6" fill="#242040" />
            <ellipse cx="60" cy="8" rx="50" ry="4" fill="#1a1730" />
          </svg>
        </motion.div>
      </div>

      {/* Message */}
      <motion.p
        className="text-sm text-gray-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {message}
      </motion.p>
    </div>
  );
}
