import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Movie, WatchlistEntry, SwipeDirection } from '../types';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from '../services/localNotifications';

interface SwipeHistoryEntry {
  movie: Movie;
  direction: SwipeDirection;
}

const UNDO_STACK_LIMIT = 5;
// Obergrenze für gemerkte Links-Swipes. Begrenzt localStorage-Größe und
// Firestore-Write-Payload; für die Discovery reicht ein Fenster der letzten
// Ablehnungen (TMDB liefert ohnehin randomisierte Seiten).
const SKIPPED_IDS_LIMIT = 2000;

interface AppState {
  // Onboarding
  onboardingDone: boolean;
  setOnboardingDone: (done: boolean) => void;

  // Selected providers
  selectedProviders: string[];
  toggleProvider: (id: string) => void;
  setProviders: (ids: string[]) => void;

  // Content filter
  contentFilter: 'all' | 'movie' | 'series';
  setContentFilter: (filter: 'all' | 'movie' | 'series') => void;

  // Language filter
  selectedLanguages: string[];
  toggleLanguage: (code: string) => void;
  setLanguages: (codes: string[]) => void;

  // Genre filter
  selectedGenres: string[];
  toggleGenre: (id: string) => void;
  setGenres: (ids: string[]) => void;

  // Movies from API
  movies: Movie[];
  setMovies: (movies: Movie[]) => void;
  addMovies: (movies: Movie[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;

  // Swipe
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  getFilteredMovies: () => Movie[];
  swipeRight: (movie: Movie) => void;
  swipeLeft: (movie: Movie) => void;
  swipeUp: (movie: Movie) => void;
  swipeDown: (movie: Movie) => void;
  resetDeck: () => void;

  // Undo
  swipeHistory: SwipeHistoryEntry[];
  undoLastSwipe: () => SwipeHistoryEntry | null;
  canUndo: () => boolean;

  // Watchlist
  watchlist: WatchlistEntry[];
  toggleWatched: (movieId: number) => void;
  removeFromWatchlist: (movieId: number) => void;

  // Skipped
  skippedIds: number[];
  setSkippedIds: (ids: number[]) => void;

  // Bulk setters for cloud sync
  setWatchlist: (entries: WatchlistEntry[]) => void;
  hydrateFromCloud: (data: {
    watchlist?: WatchlistEntry[];
    skippedIds?: number[];
    selectedProviders?: string[];
    onboardingDone?: boolean;
    contentFilter?: 'all' | 'movie' | 'series';
    selectedLanguages?: string[];
    selectedGenres?: string[];
  }) => void;

  // Premium & Ads
  isPremium: boolean;
  setPremium: (premium: boolean) => void;
  swipesSinceAd: number;
  incrementSwipesSinceAd: () => void;
  resetSwipesSinceAd: () => void;
  shouldShowAd: () => boolean;

  // Notifications
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;

  // Trending Cache
  trendingMovies: Movie[];
  trendingLastFetch: number;
  trendingProvidersKey: string;
  setTrendingMovies: (movies: Movie[], providersKey: string) => void;

  // Kompletter Reset (Daten zurücksetzen / Konto löschen)
  resetAll: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboardingDone: false,
      setOnboardingDone: (done) => set({ onboardingDone: done }),

      selectedProviders: [],
      toggleProvider: (id) =>
        set((state) => ({
          selectedProviders: state.selectedProviders.includes(id)
            ? state.selectedProviders.filter((p) => p !== id)
            : [...state.selectedProviders, id],
        })),
      setProviders: (ids) => set({ selectedProviders: ids }),

      contentFilter: 'all',
      setContentFilter: (filter) => set({ contentFilter: filter }),

      selectedLanguages: [],
      toggleLanguage: (code) =>
        set((state) => ({
          selectedLanguages: state.selectedLanguages.includes(code)
            ? state.selectedLanguages.filter((l) => l !== code)
            : [...state.selectedLanguages, code],
        })),
      setLanguages: (codes) => set({ selectedLanguages: codes }),

      selectedGenres: [],
      toggleGenre: (id) =>
        set((state) => ({
          selectedGenres: state.selectedGenres.includes(id)
            ? state.selectedGenres.filter((g) => g !== id)
            : [...state.selectedGenres, id],
        })),
      setGenres: (ids) => set({ selectedGenres: ids }),

      movies: [],
      setMovies: (movies) => set({ movies }),
      addMovies: (newMovies) =>
        set((state) => {
          const existingIds = new Set(state.movies.map((m) => m.id));
          const unique = newMovies.filter((m) => !existingIds.has(m.id));
          return { movies: [...state.movies, ...unique] };
        }),
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      currentPage: 1,
      setCurrentPage: (page) => set({ currentPage: page }),

      currentIndex: 0,
      setCurrentIndex: (index) => set({ currentIndex: index }),
      getFilteredMovies: () => {
        const { movies, contentFilter, watchlist, skippedIds, selectedProviders } = get();
        // Sets einmal bauen statt O(n)-includes pro Film
        const watchlistIds = new Set(watchlist.map((w) => w.movie.id));
        const skippedSet = new Set(skippedIds);
        return movies.filter((m) => {
          if (contentFilter !== 'all' && m.type !== contentFilter) return false;
          if (watchlistIds.has(m.id)) return false;
          if (skippedSet.has(m.id)) return false;
          // Nur Titel anzeigen die mindestens einen ausgewählten Anbieter haben
          if (!m.providers.some((p) => selectedProviders.includes(p))) return false;
          return true;
        });
      },

      swipeRight: (movie) =>
        set((state) => ({
          watchlist: [
            ...state.watchlist,
            { movie, addedAt: Date.now(), watched: false, isFavorite: false },
          ],
          swipeHistory: [
            ...state.swipeHistory.slice(-(UNDO_STACK_LIMIT - 1)),
            { movie, direction: 'right' },
          ],
        })),

      swipeLeft: (movie) =>
        set((state) => ({
          // Ring-Puffer: nur die letzten SKIPPED_IDS_LIMIT behalten, sonst
          // wächst das Array (und jeder Firestore-Sync) unbegrenzt.
          skippedIds: [
            ...state.skippedIds.slice(-(SKIPPED_IDS_LIMIT - 1)),
            movie.id,
          ],
          swipeHistory: [
            ...state.swipeHistory.slice(-(UNDO_STACK_LIMIT - 1)),
            { movie, direction: 'left' },
          ],
        })),

      swipeUp: (movie) =>
        set((state) => ({
          watchlist: [
            ...state.watchlist,
            { movie, addedAt: Date.now(), watched: false, isFavorite: true },
          ],
          swipeHistory: [
            ...state.swipeHistory.slice(-(UNDO_STACK_LIMIT - 1)),
            { movie, direction: 'up' },
          ],
        })),

      swipeDown: (movie) =>
        set((state) => ({
          watchlist: [
            ...state.watchlist,
            { movie, addedAt: Date.now(), watched: true, isFavorite: false },
          ],
          swipeHistory: [
            ...state.swipeHistory.slice(-(UNDO_STACK_LIMIT - 1)),
            { movie, direction: 'down' },
          ],
        })),

      resetDeck: () => set({ currentIndex: 0, skippedIds: [], swipeHistory: [] }),

      swipeHistory: [],
      canUndo: () => get().swipeHistory.length > 0,
      undoLastSwipe: () => {
        const { swipeHistory } = get();
        if (swipeHistory.length === 0) return null;
        const last = swipeHistory[swipeHistory.length - 1];
        set((state) => ({
          swipeHistory: state.swipeHistory.slice(0, -1),
          // Undo the side-effects of the last swipe
          watchlist:
            last.direction === 'left'
              ? state.watchlist
              : state.watchlist.filter((w) => w.movie.id !== last.movie.id),
          skippedIds:
            last.direction === 'left'
              ? state.skippedIds.filter((id) => id !== last.movie.id)
              : state.skippedIds,
        }));
        return last;
      },

      watchlist: [],
      toggleWatched: (movieId) =>
        set((state) => ({
          watchlist: state.watchlist.map((w) =>
            w.movie.id === movieId ? { ...w, watched: !w.watched } : w
          ),
        })),
      removeFromWatchlist: (movieId) =>
        set((state) => ({
          watchlist: state.watchlist.filter((w) => w.movie.id !== movieId),
        })),

      skippedIds: [],
      setSkippedIds: (ids) => set({ skippedIds: ids }),

      setWatchlist: (entries) => set({ watchlist: entries }),
      hydrateFromCloud: (data) =>
        set(() => ({
          ...(data.watchlist !== undefined && { watchlist: data.watchlist }),
          ...(data.skippedIds !== undefined && { skippedIds: data.skippedIds }),
          ...(data.selectedProviders !== undefined && {
            selectedProviders: data.selectedProviders,
          }),
          // isPremium wird bewusst NICHT aus der Cloud übernommen —
          // RevenueCat ist die einzige Quelle (siehe App.tsx).
          ...(data.onboardingDone !== undefined && {
            onboardingDone: data.onboardingDone,
          }),
          ...(data.contentFilter !== undefined && {
            contentFilter: data.contentFilter,
          }),
          ...(data.selectedLanguages !== undefined && {
            selectedLanguages: data.selectedLanguages,
          }),
          ...(data.selectedGenres !== undefined && {
            selectedGenres: data.selectedGenres,
          }),
        })),

      isPremium: false,
      setPremium: (premium) => set({ isPremium: premium }),
      swipesSinceAd: 0,
      incrementSwipesSinceAd: () =>
        set((state) => ({ swipesSinceAd: state.swipesSinceAd + 1 })),
      resetSwipesSinceAd: () => set({ swipesSinceAd: 0 }),
      shouldShowAd: () => {
        const { isPremium, swipesSinceAd } = get();
        return !isPremium && swipesSinceAd >= 15;
      },

      // Notifications
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      setNotificationSettings: (patch) =>
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...patch },
        })),

      // Trending Cache (6h). Bei leerem Ergebnis (API-Fehler / Filter greift
      // alles weg) bleiben die alten Movies erhalten — nur der Timestamp wird
      // gesetzt, damit kein sofortiger Refetch-Loop entsteht.
      trendingMovies: [],
      trendingLastFetch: 0,
      trendingProvidersKey: '',
      setTrendingMovies: (movies, providersKey) =>
        set((state) => ({
          trendingMovies: movies.length > 0 ? movies : state.trendingMovies,
          trendingLastFetch: Date.now(),
          trendingProvidersKey: providersKey,
        })),

      resetAll: () =>
        set({
          onboardingDone: false,
          selectedProviders: [],
          contentFilter: 'all',
          selectedLanguages: [],
          selectedGenres: [],
          movies: [],
          isLoading: false,
          currentPage: 1,
          currentIndex: 0,
          swipeHistory: [],
          watchlist: [],
          skippedIds: [],
          isPremium: false,
          swipesSinceAd: 0,
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
          trendingMovies: [],
          trendingLastFetch: 0,
          trendingProvidersKey: '',
        }),
    }),
    {
      name: 'watchtwin-storage',
      partialize: (state) => ({
        onboardingDone: state.onboardingDone,
        selectedProviders: state.selectedProviders,
        watchlist: state.watchlist,
        skippedIds: state.skippedIds,
        contentFilter: state.contentFilter,
        selectedLanguages: state.selectedLanguages,
        selectedGenres: state.selectedGenres,
        // isPremium bewusst NICHT persistiert — RevenueCat ist die einzige
        // Quelle (sonst wäre Premium via localStorage-Edit fälschbar und
        // würde nach Erstattung/Ablauf nie widerrufen).
        notificationSettings: state.notificationSettings,
        trendingMovies: state.trendingMovies,
        trendingLastFetch: state.trendingLastFetch,
        trendingProvidersKey: state.trendingProvidersKey,
      }),
      // Deep-Merge für verschachtelte Objekte: Wenn künftig ein neuer Sub-Key
      // in notificationSettings dazukommt, darf das persistierte Alt-Objekt
      // eines Bestandsnutzers die neuen Defaults nicht komplett ersetzen.
      merge: (persisted, current) => {
        const p = { ...((persisted ?? {}) as Partial<AppState>) };
        // Altlast aus v1.2: isPremium war früher persistiert — nie übernehmen.
        delete (p as Record<string, unknown>).isPremium;
        return {
          ...current,
          ...p,
          notificationSettings: {
            ...current.notificationSettings,
            ...(p.notificationSettings ?? {}),
          },
        };
      },
    }
  )
);
