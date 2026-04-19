export interface Provider {
  id: string;
  name: string;
  color: string;
  logo: string;
  tmdbId: number;
  /** Builds a search URL for this provider with the given title. */
  searchUrl?: (title: string) => string;
}

export interface Movie {
  id: number;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series';
  year: number;
  genres: string[];
  rating: number;
  posterUrl: string;
  overview: string;
  providers: string[]; // provider IDs
  runtime?: number; // minutes for movies
  seasons?: number; // for series
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface WatchlistEntry {
  movie: Movie;
  addedAt: number;
  watched: boolean;
  isFavorite: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  friendCode: string;
}

export interface Friendship {
  id: string;
  users: [string, string];
  status: 'pending' | 'accepted';
  requestedBy: string;
  createdAt: number;
}

export interface SwipeParty {
  id: string;
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  status: 'waiting' | 'active' | 'ended';
  movies: Movie[]; // shared deck
  /** Swipes per user: { [uid]: { [movieId]: 'like' | 'pass' } } */
  swipes: Record<string, Record<string, 'like' | 'pass'>>;
  createdAt: number;
}
