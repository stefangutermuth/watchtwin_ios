import { AnimatePresence } from 'framer-motion';
import { SwipeCard } from './SwipeCard';
import { EmptyState } from './EmptyState';
import type { Movie, SwipeDirection } from '../types';
import { useNavigate } from 'react-router-dom';

interface SwipeDeckProps {
  movies: Movie[];
  currentIndex?: number; // kept for compatibility, not used
  onSwipe: (direction: SwipeDirection, movie: Movie) => void;
  onTapCard?: (movie: Movie) => void;
}

export function SwipeDeck({ movies, onSwipe, onTapCard }: SwipeDeckProps) {
  const navigate = useNavigate();
  const visibleMovies = movies.slice(0, 2);

  if (visibleMovies.length === 0) {
    return (
      <EmptyState
        emoji="🍿"
        iconColor="pink"
        title="Alles durchgeswipet!"
        description="Du hast alle Titel gesehen. Schau in deine Watchlist oder passe deine Filter an, um noch mehr zu entdecken."
        action={{
          label: 'Zur Watchlist',
          onClick: () => navigate('/watchlist'),
        }}
        secondaryAction={{
          label: 'Profil & Filter anpassen',
          onClick: () => navigate('/profile'),
        }}
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {visibleMovies
          .map((movie, i) => (
            <SwipeCard
              key={movie.id}
              movie={movie}
              isTop={i === 0}
              onSwipe={(dir) => onSwipe(dir, movie)}
              onTap={() => onTapCard?.(movie)}
            />
          ))
          .reverse()}
      </AnimatePresence>
    </div>
  );
}
