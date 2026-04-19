import { useEffect, useCallback, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faHeart, faRotateLeft, faStar, faEye, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { SwipeDeck } from '../components/SwipeDeck';
import { SwipeSkeleton } from '../components/SwipeSkeleton';
import { MovieDetailModal } from '../components/MovieDetailModal';
import { AdOverlay } from '../components/AdOverlay';
import { LoginPrompt } from '../components/LoginPrompt';
import { SwipeTutorial } from '../components/SwipeTutorial';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { discoverMovies } from '../services/tmdb';
import { hapticLight, hapticMedium, hapticWarning } from '../services/haptics';
import { trackSwipe } from '../services/analytics';
import type { Movie, SwipeDirection } from '../types';

export function SwipePage() {
  const movies = useStore((s) => s.movies);
  const addMovies = useStore((s) => s.addMovies);
  const setMovies = useStore((s) => s.setMovies);
  const isLoading = useStore((s) => s.isLoading);
  const setIsLoading = useStore((s) => s.setIsLoading);
  const selectedProviders = useStore((s) => s.selectedProviders);
  const getFilteredMovies = useStore((s) => s.getFilteredMovies);
  const swipeRight = useStore((s) => s.swipeRight);
  const swipeLeft = useStore((s) => s.swipeLeft);
  const swipeUp = useStore((s) => s.swipeUp);
  const swipeDown = useStore((s) => s.swipeDown);
  const contentFilter = useStore((s) => s.contentFilter);
  const setContentFilter = useStore((s) => s.setContentFilter);
  const selectedLanguages = useStore((s) => s.selectedLanguages);
  const selectedGenres = useStore((s) => s.selectedGenres);
  const currentIndex = useStore((s) => s.currentIndex);
  const setCurrentIndex = useStore((s) => s.setCurrentIndex);
  const undoLastSwipe = useStore((s) => s.undoLastSwipe);
  const swipeHistory = useStore((s) => s.swipeHistory);
  const isPremium = useStore((s) => s.isPremium);
  const setPremium = useStore((s) => s.setPremium);
  const swipesSinceAd = useStore((s) => s.swipesSinceAd);
  const incrementSwipesSinceAd = useStore((s) => s.incrementSwipesSinceAd);
  const resetSwipesSinceAd = useStore((s) => s.resetSwipesSinceAd);
  const { user } = useAuth();
  const [showAd, setShowAd] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<{ visible: boolean; reason: 'watchlist' | 'premium' | 'favorite' }>({
    visible: false,
    reason: 'watchlist',
  });

  const loadMovies = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      try {
        const newMovies = await discoverMovies(selectedProviders, selectedLanguages, selectedGenres);
        if (reset) {
          setMovies(newMovies);
        } else {
          addMovies(newMovies);
        }
      } catch (err) {
        console.error('Failed to load movies:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedProviders, selectedLanguages, selectedGenres, setIsLoading, setMovies, addMovies]
  );

  // Initial load
  useEffect(() => {
    if (selectedProviders.length > 0 && movies.length === 0) {
      loadMovies(true);
    }
  }, [selectedProviders, movies.length, loadMovies]);

  // Reload when providers, languages or genres change
  const filtersKey = [
    selectedProviders.slice().sort().join(','),
    selectedLanguages.slice().sort().join(','),
    selectedGenres.slice().sort().join(','),
  ].join('|');
  const prevFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey && selectedProviders.length > 0) {
      prevFiltersKey.current = filtersKey;
      setCurrentIndex(0);
      loadMovies(true);
    }
  }, [filtersKey, selectedProviders.length, loadMovies, setCurrentIndex]);

  const filtered = getFilteredMovies();

  // Load more random titles when running low
  useEffect(() => {
    if (
      !isLoading &&
      filtered.length > 0 &&
      filtered.length <= 3
    ) {
      loadMovies();
    }
  }, [filtered.length, isLoading, loadMovies]);

  function handleSwipe(direction: SwipeDirection, movie: Movie) {
    // Speichern-Aktionen (rechts, oben, unten) erfordern Login
    if (!user && direction !== 'left') {
      setLoginPrompt({
        visible: true,
        reason: direction === 'up' ? 'favorite' : 'watchlist',
      });
      return;
    }

    // Haptic feedback
    if (direction === 'right' || direction === 'up') {
      hapticMedium();
    } else {
      hapticLight();
    }

    if (direction === 'right') {
      swipeRight(movie);
    } else if (direction === 'left') {
      swipeLeft(movie);
    } else if (direction === 'up') {
      swipeUp(movie);
    } else if (direction === 'down') {
      swipeDown(movie);
    }
    trackSwipe(direction, movie.id, movie.type);

    // Ad logic: show ad every 15 swipes for free users
    if (!isPremium) {
      incrementSwipesSinceAd();
      if (swipesSinceAd + 1 >= 15) {
        setShowAd(true);
      }
    }
  }

  function handleFilterChange(filter: 'all' | 'movie' | 'series') {
    setContentFilter(filter);
    setCurrentIndex(0);
  }

  function handleUndo() {
    const last = undoLastSwipe();
    if (last) {
      hapticWarning();
    }
  }

  const canUndo = swipeHistory.length > 0;

  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const currentMovie = filtered[0];

  function handleDetailSwipe(direction: SwipeDirection) {
    if (currentMovie) {
      handleSwipe(direction, currentMovie);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <img src="/logo.png" alt="WatchTwin" className="h-8" />
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-wt-surface p-1">
          {(['all', 'movie', 'series'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                contentFilter === f
                  ? 'bg-wt-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Alle' : f === 'movie' ? 'Filme' : 'Serien'}
            </button>
          ))}
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-wt-surface hover:text-white"
            aria-label="Hilfe"
            title="So funktioniert's"
          >
            <FontAwesomeIcon icon={faCircleQuestion} className="text-lg" />
          </button>
        </div>
      </div>

      {/* Swipe area */}
      <div className="relative flex-1 px-4 pb-4">
        {isLoading && filtered.length === 0 ? (
          <SwipeSkeleton />
        ) : (
          <SwipeDeck
            movies={filtered}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
            onTapCard={(movie) => setDetailMovie(movie)}
          />
        )}
      </div>

      {/* Action buttons */}
      {currentMovie && (
        <div className="flex items-center justify-center gap-3 pb-5">
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Letzten Swipe rückgängig"
            className={`group flex h-11 w-11 items-center justify-center rounded-full bg-wt-card shadow-md ring-1 transition-all ${
              canUndo
                ? 'text-yellow-400 ring-yellow-400/30 hover:scale-110 active:scale-95'
                : 'text-gray-600 ring-white/5 opacity-40'
            }`}
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-base" />
          </button>

          {/* Nope */}
          <button
            onClick={() => handleSwipe('left', currentMovie)}
            aria-label="Nope"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-wt-card text-red-500 shadow-xl ring-1 ring-red-500/40 transition-all hover:scale-110 hover:ring-red-500 hover:shadow-red-500/30 active:scale-95"
          >
            <FontAwesomeIcon icon={faXmark} className="text-2xl drop-shadow" />
          </button>

          {/* Gesehen */}
          <button
            onClick={() => handleSwipe('down', currentMovie)}
            aria-label="Schon gesehen"
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-wt-card text-sky-400 shadow-lg ring-1 ring-sky-400/40 transition-all hover:scale-110 hover:ring-sky-400 hover:shadow-sky-500/30 active:scale-95"
          >
            <FontAwesomeIcon icon={faEye} className="text-base" />
          </button>

          {/* Super Like */}
          <button
            onClick={() => handleSwipe('up', currentMovie)}
            aria-label="Super Like"
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-wt-purple to-wt-pink text-white shadow-lg shadow-wt-pink/40 transition-all hover:scale-110 active:scale-95"
          >
            <FontAwesomeIcon icon={faStar} className="text-base drop-shadow" />
          </button>

          {/* Like */}
          <button
            onClick={() => handleSwipe('right', currentMovie)}
            aria-label="Like"
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-xl shadow-emerald-500/40 transition-all hover:scale-110 hover:shadow-emerald-500/60 active:scale-95"
          >
            <FontAwesomeIcon icon={faHeart} className="text-2xl drop-shadow" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <MovieDetailModal
        movie={detailMovie}
        onClose={() => setDetailMovie(null)}
        onSwipe={handleDetailSwipe}
      />

      {/* Ad Overlay — rendered via portal to escape stacking context */}
      {showAd && (
        <AdOverlay
          visible={showAd}
          onClose={() => {
            setShowAd(false);
            resetSwipesSinceAd();
          }}
          onUpgrade={() => {
            setPremium(true);
            setShowAd(false);
            resetSwipesSinceAd();
          }}
        />
      )}

      {/* Login Prompt for guests */}
      <LoginPrompt
        visible={loginPrompt.visible}
        reason={loginPrompt.reason}
        onClose={() => setLoginPrompt({ ...loginPrompt, visible: false })}
      />

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-wt-dark p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
              initial={{ y: 400, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 400, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowHelp(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-wt-card text-gray-400 hover:text-white"
                aria-label="Schließen"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <h2 className="text-center text-lg font-bold text-white">
                So funktioniert's
              </h2>
              <p className="mt-1 text-center text-xs text-gray-400">
                Swipe die Karte in eine der 4 Richtungen
              </p>
              <SwipeTutorial compact />
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink py-3 text-sm font-bold text-white"
              >
                Verstanden
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
