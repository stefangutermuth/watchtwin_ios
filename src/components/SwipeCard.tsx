import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import type { Movie, SwipeDirection } from '../types';
import { providers } from '../data/providers';

interface SwipeCardProps {
  movie: Movie;
  onSwipe: (direction: SwipeDirection) => void;
  onTap?: () => void;
  isTop: boolean;
}

export function SwipeCard({ movie, onSwipe, onTap, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);
  const seenOpacity = useTransform(y, [0, 100], [0, 1]);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const didDragRef = useRef(false);
  const swipedRef = useRef(false);
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    didDragRef.current = false;
  }

  function handlePointerUp(e: React.PointerEvent) {
    const start = pointerStartRef.current;
    if (!start) return;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    const dt = Date.now() - start.time;

    if (dx < 10 && dy < 10 && dt < 300 && !didDragRef.current) {
      onTap?.();
    }
    pointerStartRef.current = null;
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    didDragRef.current = true;
    if (swipedRef.current) return;

    const absX = Math.abs(info.offset.x);
    const absY = Math.abs(info.offset.y);

    // Determine dominant axis
    if (absX > absY) {
      if (info.offset.x > 100) {
        swipedRef.current = true;
        setExitDirection('right');
        onSwipe('right');
      } else if (info.offset.x < -100) {
        swipedRef.current = true;
        setExitDirection('left');
        onSwipe('left');
      }
    } else {
      if (info.offset.y < -80) {
        swipedRef.current = true;
        setExitDirection('up');
        onSwipe('up');
      } else if (info.offset.y > 80) {
        swipedRef.current = true;
        setExitDirection('down');
        onSwipe('down');
      }
    }
  }

  const movieProviders = providers.filter((p) =>
    movie.providers.includes(p.id)
  );

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, zIndex: isTop ? 10 : 0 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7 }}
      exit={
        exitDirection === 'up'
          ? { y: -600, opacity: 0, transition: { duration: 0.3 } }
          : exitDirection === 'down'
            ? { y: 600, opacity: 0, transition: { duration: 0.3 } }
            : exitDirection === 'left'
              ? { x: -300, opacity: 0, transition: { duration: 0.3 } }
              : { x: 300, opacity: 0, transition: { duration: 0.3 } }
      }
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-wt-card shadow-2xl">
        {/* Blurred backdrop (fills letterboxing) */}
        <img
          src={movie.posterUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-40"
          draggable={false}
        />

        {/* Foreground poster — contained, never cropped */}
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="relative z-[1] h-full w-full object-contain"
          draggable={false}
        />

        {/* Bottom gradient for text readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[55%] bg-gradient-to-t from-black via-black/80 to-transparent" />

        {/* Swipe indicators */}
        {isTop && (
          <>
            {/* LIKE - right */}
            <motion.div
              className="absolute left-5 top-5 z-[3] rounded-lg border-4 border-green-500 bg-black/40 px-3 py-1.5 font-bold text-green-500 backdrop-blur-sm"
              style={{ opacity: likeOpacity, rotate: -20 }}
            >
              <span className="text-2xl">LIKE</span>
            </motion.div>
            {/* NOPE - left */}
            <motion.div
              className="absolute right-5 top-5 z-[3] rounded-lg border-4 border-red-500 bg-black/40 px-3 py-1.5 font-bold text-red-500 backdrop-blur-sm"
              style={{ opacity: nopeOpacity, rotate: 20 }}
            >
              <span className="text-2xl">NOPE</span>
            </motion.div>
            {/* SUPER LIKE - up */}
            <motion.div
              className="absolute bottom-24 left-1/2 z-[3] -translate-x-1/2 rounded-lg border-4 border-wt-purple-light bg-black/40 px-4 py-1.5 font-bold text-wt-purple-light backdrop-blur-sm"
              style={{ opacity: superLikeOpacity }}
            >
              <span className="text-2xl">TOP ⭐</span>
            </motion.div>
            {/* GESEHEN - down */}
            <motion.div
              className="absolute top-1/3 left-1/2 z-[3] -translate-x-1/2 rounded-lg border-4 border-blue-400 bg-black/40 px-4 py-1.5 font-bold text-blue-400 backdrop-blur-sm"
              style={{ opacity: seenOpacity }}
            >
              <span className="text-2xl">GESEHEN ✓</span>
            </motion.div>
          </>
        )}

        {/* Top badges */}
        <div className="absolute left-3 top-3 z-[3] rounded-full bg-wt-pink/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          {movie.type === 'movie' ? 'Film' : 'Serie'}
        </div>
        <div className="absolute right-3 top-3 z-[3] flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
          <FontAwesomeIcon icon={faStar} className="text-[10px] text-wt-purple-lighter" />
          <span className="text-xs font-bold text-white">{movie.rating}</span>
        </div>

        {/* Info overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 z-[3] px-4 pb-4 pt-10">
          {/* Title + Year */}
          <div className="flex items-end justify-between gap-2">
            <h2 className="line-clamp-2 text-xl font-bold leading-tight text-white drop-shadow-lg">
              {movie.title}
            </h2>
            <span className="shrink-0 pb-0.5 text-sm font-medium text-gray-300">
              {movie.year}
            </span>
          </div>

          {/* Genres */}
          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Provider logos */}
          {movieProviders.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                {movieProviders.slice(0, 5).map((p) => (
                  <img
                    key={p.id}
                    src={p.logo}
                    alt={p.name}
                    title={p.name}
                    className="h-7 w-7 rounded-md ring-1 ring-white/20"
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-300">
                Tippen für Details
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
