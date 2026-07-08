import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faStar } from '@fortawesome/free-solid-svg-icons';
import type { Movie } from '../types';
import { useStore } from '../store/useStore';
import { getTrendingThisWeek } from '../services/tmdb';
import { MovieDetailModal } from './MovieDetailModal';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export function TrendingRail() {
  const trendingMovies = useStore((s) => s.trendingMovies);
  const trendingLastFetch = useStore((s) => s.trendingLastFetch);
  const trendingProvidersKey = useStore((s) => s.trendingProvidersKey);
  const setTrendingMovies = useStore((s) => s.setTrendingMovies);
  const selectedProviders = useStore((s) => s.selectedProviders);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Stabiler Cache-Key der Provider-Auswahl — ändert sich der, ist der
  // Cache ungültig (sonst zeigt die Leiste nach Provider-Wechsel bis zu
  // 6h die alten, falsch gefilterten Titel).
  const providersKey = [...selectedProviders].sort().join(',');

  useEffect(() => {
    const now = Date.now();
    // Freshness hängt am Timestamp, NICHT an trendingMovies.length —
    // sonst löst ein leeres Ergebnis (API-Fehler / Filter greift alles weg)
    // eine Endlos-Refetch-Schleife aus.
    const isFresh =
      trendingLastFetch > 0 &&
      now - trendingLastFetch < CACHE_TTL_MS &&
      trendingProvidersKey === providersKey;
    if (isFresh) return;

    let cancelled = false;
    setLoading(true);
    getTrendingThisWeek(selectedProviders, 20)
      .then((movies) => {
        if (!cancelled) setTrendingMovies(movies, providersKey);
      })
      .catch((err) => {
        console.warn('[TrendingRail] Fetch fehlgeschlagen:', err);
        // Timestamp trotzdem setzen, damit kein Refetch-Sturm entsteht
        if (!cancelled) setTrendingMovies([], providersKey);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedProviders ist über providersKey abgedeckt
  }, [providersKey, trendingLastFetch, trendingProvidersKey, setTrendingMovies]);

  if (!loading && trendingMovies.length === 0) return null;

  return (
    <>
      <div className="mb-3 px-4">
        <div className="mb-2 flex items-center gap-2">
          <FontAwesomeIcon icon={faFire} className="text-wt-pink" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Neu & Trending
          </h2>
          <span className="text-xs text-gray-500">diese Woche</span>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {loading && trendingMovies.length === 0 ? (
              // Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-28 w-20 flex-shrink-0 animate-pulse rounded-lg bg-wt-surface"
                />
              ))
            ) : (
              trendingMovies.map((movie, idx) => (
                <motion.button
                  key={movie.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.25 }}
                  onClick={() => setSelectedMovie(movie)}
                  className="group relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-wt-surface shadow-md transition-transform active:scale-95"
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {/* Rating-Badge */}
                  <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
                    <FontAwesomeIcon
                      icon={faStar}
                      className="text-[7px] text-yellow-400"
                    />
                    {movie.rating.toFixed(1)}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>

      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        hideActions
      />
    </>
  );
}
