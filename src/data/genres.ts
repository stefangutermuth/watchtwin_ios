export interface Genre {
  id: string;
  label: string;
  emoji: string;
  movieId?: number;
  tvId?: number;
}

// Labels auf Deutsch, mit TMDB Genre-IDs für Filme und Serien.
// Wenn movieId/tvId fehlt, gibt es dieses Genre dort nicht (z.B. Horror ist reines Movie-Genre).
export const GENRES: Genre[] = [
  { id: 'action', label: 'Action', emoji: '💥', movieId: 28, tvId: 10759 },
  { id: 'adventure', label: 'Abenteuer', emoji: '🗺️', movieId: 12, tvId: 10759 },
  { id: 'animation', label: 'Animation', emoji: '🎨', movieId: 16, tvId: 16 },
  { id: 'comedy', label: 'Komödie', emoji: '😂', movieId: 35, tvId: 35 },
  { id: 'crime', label: 'Krimi', emoji: '🕵️', movieId: 80, tvId: 80 },
  { id: 'documentary', label: 'Dokumentation', emoji: '🎬', movieId: 99, tvId: 99 },
  { id: 'drama', label: 'Drama', emoji: '🎭', movieId: 18, tvId: 18 },
  { id: 'family', label: 'Familie', emoji: '👨‍👩‍👧', movieId: 10751, tvId: 10751 },
  { id: 'fantasy', label: 'Fantasy', emoji: '🧙', movieId: 14, tvId: 10765 },
  { id: 'history', label: 'Historie', emoji: '🏛️', movieId: 36 },
  { id: 'horror', label: 'Horror', emoji: '👻', movieId: 27 },
  { id: 'mystery', label: 'Mystery', emoji: '🔍', movieId: 9648, tvId: 9648 },
  { id: 'romance', label: 'Romantik', emoji: '💖', movieId: 10749 },
  { id: 'scifi', label: 'Sci-Fi', emoji: '🚀', movieId: 878, tvId: 10765 },
  { id: 'thriller', label: 'Thriller', emoji: '🔪', movieId: 53 },
  { id: 'war', label: 'Kriegsfilm', emoji: '⚔️', movieId: 10752, tvId: 10768 },
  { id: 'western', label: 'Western', emoji: '🤠', movieId: 37, tvId: 37 },
];

export function buildGenreParam(
  selectedGenreIds: string[],
  type: 'movie' | 'tv'
): { hasSelection: boolean; hasMatches: boolean; param: string } {
  const hasSelection = selectedGenreIds.length > 0;
  if (!hasSelection) return { hasSelection: false, hasMatches: true, param: '' };

  const ids = selectedGenreIds
    .map((id) => GENRES.find((g) => g.id === id))
    .filter((g): g is Genre => !!g)
    .map((g) => (type === 'movie' ? g.movieId : g.tvId))
    .filter((v): v is number => typeof v === 'number');

  const unique = Array.from(new Set(ids));
  if (unique.length === 0) {
    return { hasSelection: true, hasMatches: false, param: '' };
  }
  return {
    hasSelection: true,
    hasMatches: true,
    param: `&with_genres=${unique.join('|')}`,
  };
}
