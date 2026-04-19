import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { providers, openProvider } from '../data/providers';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCheck, faTrash, faCrown, faBookmark, faLayerGroup, faEye } from '@fortawesome/free-solid-svg-icons';
import { MovieDetailModal } from '../components/MovieDetailModal';
import { EmptyState } from '../components/EmptyState';
import type { Movie } from '../types';

export function WatchlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const watchlist = useStore((s) => s.watchlist);
  const toggleWatched = useStore((s) => s.toggleWatched);
  const removeFromWatchlist = useStore((s) => s.removeFromWatchlist);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'unwatched' | 'watched'>('all');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Guest: show login prompt
  if (!user) {
    return (
      <EmptyState
        icon={faBookmark}
        iconColor="pink"
        title="Deine Watchlist"
        description="Melde dich an, um Filme und Serien zu speichern und auf allen Geräten zu synchronisieren."
        action={{
          label: 'Kostenlos registrieren',
          onClick: () => navigate('/auth'),
        }}
        secondaryAction={{
          label: 'Weiter swipen',
          onClick: () => navigate('/swipe'),
        }}
      />
    );
  }

  const filtered = watchlist
    .filter((w) => {
      if (filter === 'watched') return w.watched;
      if (filter === 'unwatched') return !w.watched;
      if (filter === 'favorites') return w.isFavorite;
      return true;
    })
    .sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.addedAt - a.addedAt;
    });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-white">Deine Watchlist</h1>
          <span className="text-xs font-medium text-gray-500">
            {watchlist.length} {watchlist.length === 1 ? 'Titel' : 'Titel'}
          </span>
        </div>

        {/* Filter-Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            { id: 'all', label: 'Alle', icon: faLayerGroup, count: watchlist.length, activeGradient: 'from-wt-purple to-wt-pink', activeShadow: 'shadow-wt-pink/30' },
            { id: 'favorites', label: 'Top', icon: faCrown, count: watchlist.filter((w) => w.isFavorite).length, activeGradient: 'from-amber-400 to-wt-pink', activeShadow: 'shadow-amber-500/30' },
            { id: 'unwatched', label: 'Offen', icon: faBookmark, count: watchlist.filter((w) => !w.watched).length, activeGradient: 'from-sky-400 to-wt-purple', activeShadow: 'shadow-sky-500/30' },
            { id: 'watched', label: 'Gesehen', icon: faEye, count: watchlist.filter((w) => w.watched).length, activeGradient: 'from-emerald-400 to-green-600', activeShadow: 'shadow-emerald-500/30' },
          ] as const).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`group flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                  active
                    ? `bg-gradient-to-br ${tab.activeGradient} text-white shadow-lg ${tab.activeShadow}`
                    : 'bg-wt-card text-gray-400 ring-1 ring-white/5 hover:text-white'
                }`}
              >
                <FontAwesomeIcon
                  icon={tab.icon}
                  className={`text-[11px] ${active ? '' : 'text-gray-500 group-hover:text-white'}`}
                />
                <span>{tab.label}</span>
                <span
                  className={`flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    active
                      ? 'bg-white/25 text-white'
                      : 'bg-wt-surface text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          watchlist.length === 0 ? (
            <EmptyState
              emoji="🍿"
              iconColor="pink"
              title="Noch nichts gespeichert"
              description="Wische im Entdecken-Tab nach rechts, um Filme und Serien auf deine Watchlist zu setzen."
              action={{
                label: 'Los swipen',
                onClick: () => navigate('/swipe'),
              }}
            />
          ) : (
            <EmptyState
              emoji={filter === 'favorites' ? '👑' : filter === 'watched' ? '👀' : '📼'}
              iconColor={filter === 'favorites' ? 'amber' : filter === 'watched' ? 'emerald' : 'sky'}
              title={
                filter === 'favorites'
                  ? 'Noch keine Top-Favoriten'
                  : filter === 'watched'
                    ? 'Noch nichts gesehen'
                    : 'Alles schon gesehen!'
              }
              description={
                filter === 'favorites'
                  ? 'Wische beim Swipen nach oben (⭐), um einen Titel zu deinen Top-Favoriten hinzuzufügen.'
                  : filter === 'watched'
                    ? 'Markiere Titel als „Gesehen", um sie hier zu sammeln.'
                    : 'Du hast alle Titel deiner Watchlist gesehen. Zeit für neue Entdeckungen!'
              }
              secondaryAction={{
                label: 'Alle anzeigen',
                onClick: () => setFilter('all'),
              }}
            />
          )
        ) : (
          <div className="space-y-3">
            {filtered.map(({ movie, watched, isFavorite }) => {
              const movieProviders = providers.filter((p) =>
                movie.providers.includes(p.id)
              );
              return (
                <div
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className={`flex gap-3 rounded-xl p-3 cursor-pointer transition-colors active:bg-wt-surface ${
                    isFavorite
                      ? 'bg-wt-purple/10 border border-wt-purple/30'
                      : 'bg-wt-card'
                  } ${watched ? 'opacity-60' : ''}`}
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="h-24 w-16 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-1.5">
                        {isFavorite && (
                          <FontAwesomeIcon icon={faCrown} className="text-wt-purple-light text-xs" />
                        )}
                        {movie.title}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <FontAwesomeIcon icon={faStar} className="text-wt-purple-lighter text-[10px]" />
                        <span>{movie.rating}</span>
                        <span>{movie.year}</span>
                        <span>
                          {movie.type === 'movie' ? 'Film' : 'Serie'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {movieProviders.map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openProvider(p, movie.title);
                            }}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                            style={{ backgroundColor: p.color }}
                            title={`Bei ${p.name} öffnen`}
                          >
                            <img src={p.logo} alt={p.name} className="h-3 w-3 rounded-sm" />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatched(movie.id);
                        }}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                          watched
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                        {watched ? 'Gesehen' : 'Als gesehen'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(movie.id);
                        }}
                        className="flex items-center gap-1 rounded-md bg-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        hideActions
      />
    </div>
  );
}
