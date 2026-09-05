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
  /** Deck manuell neu laden (EmptyState-Button). */
  onReload?: () => void;
}

export function SwipeDeck({ movies, onSwipe, onTapCard, onReload }: SwipeDeckProps) {
  const navigate = useNavigate();
  const visibleMovies = movies.slice(0, 2);

  if (visibleMovies.length === 0) {
    // Ein leeres Deck heißt fast nie „wirklich alles gesehen" — meist hat
    // TMDB gerade gedrosselt (429) oder der Zufallsseiten-Batch war leer.
    // Deshalb: Neu laden als Hauptaktion, ehrlicher Text.
    return (
      <EmptyState
        emoji="🍿"
        iconColor="pink"
        title="Gerade keine neuen Titel"
        description="Wir haben nichts Passendes mehr auf Lager. Lade neue Vorschläge oder passe deine Anbieter und Filter an."
        action={
          onReload
            ? { label: 'Neue Vorschläge laden', onClick: onReload }
            : { label: 'Zur Watchlist', onClick: () => navigate('/watchlist') }
        }
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
