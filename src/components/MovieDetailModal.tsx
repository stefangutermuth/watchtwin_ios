import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faXmark,
  faHeart,
  faTimes,
  faEye,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import type { Movie, SwipeDirection } from '../types';
import { providers, openProvider } from '../data/providers';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { getTrailerKey, getCredits, getTitleWatchLink, type Credits } from '../services/tmdb';

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
  onSwipe?: (direction: SwipeDirection) => void;
  hideActions?: boolean;
}

export function MovieDetailModal({
  movie,
  onClose,
  onSwipe,
  hideActions = false,
}: MovieDetailModalProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [watchLink, setWatchLink] = useState<string | null>(null);

  useEffect(() => {
    if (!movie) {
      setTrailerKey(null);
      setShowTrailer(false);
      setCredits(null);
      setWatchLink(null);
      return;
    }
    setShowTrailer(false);
    setTrailerLoading(true);
    getTrailerKey(movie.id, movie.type)
      .then((key) => setTrailerKey(key))
      .finally(() => setTrailerLoading(false));
    getCredits(movie.id, movie.type).then(setCredits);
    getTitleWatchLink(movie.id, movie.type).then(setWatchLink);
  }, [movie]);

  if (!movie) return null;

  const movieProviders = providers.filter((p) =>
    movie.providers.includes(p.id)
  );

  function handleAction(direction: SwipeDirection) {
    onSwipe?.(direction);
    onClose();
  }

  /** Öffnet den Trailer extern (YouTube App / In-App-Browser) — auf iOS deutlich zuverlässiger als das WKWebView-Embed. */
  async function openTrailerExternal() {
    if (!trailerKey) return;
    const url = `https://www.youtube.com/watch?v=${trailerKey}`;
    try {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
        return;
      }
    } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Auf nativem iOS niemals einbetten — direkt extern öffnen. */
  function isNative(): boolean {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  }

  return (
    <AnimatePresence>
      {movie && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-wt-card shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Drag handle — nur hier ist Drag-to-Close aktiv, damit normales Scrollen nicht blockiert wird */}
            <motion.div
              className="sticky top-0 z-20 flex cursor-grab touch-none justify-center bg-wt-card pt-3 pb-3 active:cursor-grabbing"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) {
                  onClose();
                }
              }}
            >
              <div className="h-1.5 w-12 rounded-full bg-gray-500" />
            </motion.div>

            {/* Close button — große Touch-Area, hoher z-index */}
            <button
              onClick={onClose}
              aria-label="Schließen"
              className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm shadow-lg transition-colors active:bg-black/90"
            >
              <FontAwesomeIcon icon={faTimes} className="text-base" />
            </button>

            {/* Poster / Trailer */}
            <div className="relative mx-4 overflow-hidden rounded-2xl">
              {showTrailer && trailerKey && !isNative() ? (
                <div>
                  <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                      title="Trailer"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <button
                      onClick={async () => {
                        const url = `https://www.youtube.com/watch?v=${trailerKey}`;
                        try {
                          const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
                          if (cap?.isNativePlatform?.()) {
                            const { Browser } = await import('@capacitor/browser');
                            await Browser.open({ url });
                            return;
                          }
                        } catch {}
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-wt-surface px-3 py-1 text-[11px] font-medium text-gray-300 hover:text-white"
                    >
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" />
                      Klappt nicht? Auf YouTube öffnen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full object-cover"
                    style={{ maxHeight: '50vh' }}
                  />
                  {/* Type badge */}
                  <div className="absolute left-3 top-3 rounded-full bg-wt-pink/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {movie.type === 'movie' ? 'Film' : 'Serie'}
                  </div>
                  {/* Play button — nur zentral, blockiert nicht die Ecken */}
                  {trailerKey && (
                    <button
                      onClick={() => {
                        if (isNative()) {
                          openTrailerExternal();
                        } else {
                          setShowTrailer(true);
                        }
                      }}
                      className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-wt-pink/90 text-white shadow-xl transition-transform active:scale-95"
                      aria-label="Trailer abspielen"
                    >
                      <FontAwesomeIcon icon={faPlay} className="ml-1 text-xl" />
                    </button>
                  )}
                </>
              )}
            </div>
            {!showTrailer && trailerKey && (
              <div className="mx-4 mt-2 text-center">
                <button
                  onClick={() => {
                    if (isNative()) {
                      openTrailerExternal();
                    } else {
                      setShowTrailer(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-wt-surface px-4 py-1.5 text-xs font-medium text-gray-300 hover:text-white"
                >
                  <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                  {isNative() ? 'Trailer auf YouTube öffnen' : 'Trailer abspielen'}
                </button>
              </div>
            )}
            {!showTrailer && !trailerKey && !trailerLoading && (
              <div className="mx-4 mt-2 text-center text-[11px] text-gray-500">
                Kein Trailer verfügbar
              </div>
            )}

            {/* Content */}
            <div className="px-4 pt-4 pb-6">
              {/* Title + Year */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold text-white">
                  {movie.title}
                </h2>
                <span className="shrink-0 mt-1 text-sm text-gray-500">
                  {movie.year}
                </span>
              </div>

              {/* Original title */}
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="mt-0.5 text-sm text-gray-500 italic">
                  {movie.originalTitle}
                </p>
              )}

              {/* Rating */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-wt-purple/15 px-3 py-1">
                  <FontAwesomeIcon
                    icon={faStar}
                    className="text-sm text-wt-purple-lighter"
                  />
                  <span className="text-sm font-bold text-wt-purple-lighter">
                    {movie.rating}
                  </span>
                </div>
                <span className="text-sm text-gray-500">/10</span>
              </div>

              {/* Genres */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-wt-surface px-3 py-1 text-xs font-medium text-gray-300"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <p className="mt-4 text-sm leading-relaxed text-gray-300">
                {movie.overview}
              </p>

              {/* Director / Creator */}
              {credits?.director && (
                <div className="mt-4 text-sm">
                  <span className="text-gray-500">
                    {movie.type === 'movie' ? 'Regie: ' : 'Schöpfer: '}
                  </span>
                  <span className="font-medium text-white">{credits.director}</span>
                </div>
              )}

              {/* Cast — horizontal scroll */}
              {credits && credits.cast.length > 0 && (
                <div className="mt-5 -mx-4">
                  <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Besetzung
                  </h3>
                  <div className="flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {credits.cast.map((actor) => (
                      <div
                        key={actor.id}
                        className="flex w-20 shrink-0 flex-col items-center text-center"
                      >
                        {actor.profileUrl ? (
                          <img
                            src={actor.profileUrl}
                            alt={actor.name}
                            loading="lazy"
                            className="h-20 w-20 rounded-full object-cover ring-1 ring-wt-surface"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wt-surface text-lg font-bold text-gray-500">
                            {actor.name.charAt(0)}
                          </div>
                        )}
                        <p className="mt-2 line-clamp-2 text-xs font-medium leading-tight text-white">
                          {actor.name}
                        </p>
                        {actor.character && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-gray-500">
                            {actor.character}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Providers */}
              <div className="mt-5 border-t border-wt-surface pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Jetzt ansehen auf
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {movieProviders.map((p) => (
                    <button
                      key={p.id}
                      onClick={async () => {
                        if (watchLink) {
                          try {
                            const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
                            if (cap?.isNativePlatform?.()) {
                              const { Browser } = await import('@capacitor/browser');
                              await Browser.open({ url: watchLink });
                              return;
                            }
                          } catch {}
                          window.open(watchLink, '_blank', 'noopener,noreferrer');
                          return;
                        }
                        openProvider(p, movie.title);
                      }}
                      className="group flex items-center gap-2 rounded-lg px-3 py-2 ring-1 transition-all hover:scale-[1.03] active:scale-95"
                      style={{
                        backgroundColor: `${p.color}20`,
                        boxShadow: `0 0 0 0 ${p.color}00`,
                      }}
                    >
                      <img
                        src={p.logo}
                        alt={p.name}
                        className="h-6 w-6 rounded-md"
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: p.color }}
                      >
                        {p.name}
                      </span>
                      <FontAwesomeIcon
                        icon={faArrowUpRightFromSquare}
                        className="text-[10px] opacity-60 transition-opacity group-hover:opacity-100"
                        style={{ color: p.color }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              {!hideActions && (
              <div className="mt-6 flex items-center justify-center gap-4">
                {/* Nope */}
                <button
                  onClick={() => handleAction('left')}
                  aria-label="Nope"
                  className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-wt-card text-red-500 shadow-xl ring-1 ring-red-500/40 transition-all hover:scale-110 hover:ring-red-500 hover:shadow-red-500/30 active:scale-95"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-2xl drop-shadow" />
                </button>
                {/* Gesehen */}
                <button
                  onClick={() => handleAction('down')}
                  aria-label="Schon gesehen"
                  className="group flex h-12 w-12 items-center justify-center rounded-full bg-wt-card text-sky-400 shadow-lg ring-1 ring-sky-400/40 transition-all hover:scale-110 hover:ring-sky-400 hover:shadow-sky-500/30 active:scale-95"
                >
                  <FontAwesomeIcon icon={faEye} className="text-base" />
                </button>
                {/* Super Like */}
                <button
                  onClick={() => handleAction('up')}
                  aria-label="Super Like"
                  className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-wt-purple to-wt-pink text-white shadow-lg shadow-wt-pink/40 transition-all hover:scale-110 active:scale-95"
                >
                  <FontAwesomeIcon icon={faStar} className="text-base drop-shadow" />
                </button>
                {/* Like */}
                <button
                  onClick={() => handleAction('right')}
                  aria-label="Like"
                  className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-xl shadow-emerald-500/40 transition-all hover:scale-110 hover:shadow-emerald-500/60 active:scale-95"
                >
                  <FontAwesomeIcon icon={faHeart} className="text-2xl drop-shadow" />
                </button>
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
