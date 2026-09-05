import { useEffect, useCallback, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faHeart, faRotateLeft, faStar, faEye, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { SwipeActionButton } from '../components/SwipeActionButton';
import { AnimatePresence, motion } from 'framer-motion';
import { SwipeDeck } from '../components/SwipeDeck';
import { SwipeSkeleton } from '../components/SwipeSkeleton';
import { MovieDetailModal } from '../components/MovieDetailModal';
import { AdOverlay } from '../components/AdOverlay';
import { LoginPrompt } from '../components/LoginPrompt';
import { SwipeTutorial } from '../components/SwipeTutorial';
import { TrendingRail } from '../components/TrendingRail';
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

  // Load more random titles when running low.
  // Schwelle 6 statt 3: Nachschub ist da, bevor das Deck leer läuft
  // (verhindert EmptyState-Flackern beim schnellen Swipen).
  useEffect(() => {
    if (
      !isLoading &&
      filtered.length > 0 &&
      filtered.length <= 6
    ) {
      loadMovies();
    }
  }, [filtered.length, isLoading, loadMovies]);

  // Leeres Deck automatisch nachladen. Ein leerer Batch heißt fast nie
  // „alles gesehen", sondern: TMDB hat gedrosselt (429) oder die zufällige
  // Seite lieferte nur bereits geswipte Titel. Ohne diesen Effekt blieb
  // die App bis zum Neustart im EmptyState hängen (Bug v1.3/1.4).
  // Max. 3 Versuche mit wachsendem Abstand, Zähler resettet sobald Titel da sind.
  const emptyRetries = useRef(0);
  useEffect(() => {
    if (filtered.length > 0) {
      emptyRetries.current = 0;
      return;
    }
    if (isLoading || selectedProviders.length === 0) return;
    if (emptyRetries.current >= 3) return;
    const attempt = emptyRetries.current++;
    const t = setTimeout(() => loadMovies(), 1500 * (attempt + 1));
    return () => clearTimeout(t);
  }, [filtered.length, isLoading, selectedProviders.length, loadMovies]);

  function handleReload() {
    emptyRetries.current = 0;
    loadMovies();
  }

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

      {/* Neu & Trending Rail — Titel können direkt aus dem Detail-Modal
          auf Watchlist / Favorit / Gesehen (gleiche Login- und Ad-Logik) */}
      <TrendingRail onSwipe={handleSwipe} />

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
            onReload={handleReload}
          />
        )}
      </div>

      {/* Action buttons */}
      {currentMovie && (
        <div className="flex items-start justify-center gap-1.5 pb-4">
          {/* Fünf identische Buttons, Farbe = Swipe-Richtung (siehe SwipeActionButton) */}
          <SwipeActionButton
            icon={faRotateLeft}
            label="Zurück"
            tone="neutral"
            onClick={handleUndo}
            disabled={!canUndo}
            ariaLabel="Letzten Swipe rückgängig"
          />
          <SwipeActionButton
            icon={faXmark}
            label="Nope"
            tone="nope"
            onClick={() => handleSwipe('left', currentMovie)}
          />
          <SwipeActionButton
            icon={faEye}
            label="Gesehen"
            tone="seen"
            onClick={() => handleSwipe('down', currentMovie)}
            ariaLabel="Schon gesehen"
          />
          <SwipeActionButton
            icon={faStar}
            label="Favorit"
            tone="favorite"
            onClick={() => handleSwipe('up', currentMovie)}
            ariaLabel="Top-Favorit"
          />
          <SwipeActionButton
            icon={faHeart}
            label="Like"
            tone="like"
            onClick={() => handleSwipe('right', currentMovie)}
          />
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
