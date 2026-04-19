import type { Movie } from '../types';
import {
  getTmdbProviderIds,
  findProviderByTmdbId,
  TMDB_IMAGE_BASE,
  POSTER_SIZE,
} from '../data/providers';
import { buildGenreParam } from '../data/genres';

const API_TOKEN = import.meta.env.VITE_TMDB_TOKEN as string;

if (!API_TOKEN) {
  console.error(
    '[TMDB] VITE_TMDB_TOKEN ist nicht gesetzt. Lege eine .env.local Datei an (siehe .env.example).'
  );
}

const BASE_URL = 'https://api.themoviedb.org/3';
const WATCH_REGION = 'DE';
const LANGUAGE = 'de-DE';

const headers = {
  Authorization: `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

// Genre maps (cached)
let movieGenres: Record<number, string> = {};
let tvGenres: Record<number, string> = {};

async function loadGenres() {
  if (Object.keys(movieGenres).length > 0) return;

  const [movieRes, tvRes] = await Promise.all([
    fetch(`${BASE_URL}/genre/movie/list?language=${LANGUAGE}`, { headers }),
    fetch(`${BASE_URL}/genre/tv/list?language=${LANGUAGE}`, { headers }),
  ]);

  const movieData = await movieRes.json();
  const tvData = await tvRes.json();

  movieGenres = Object.fromEntries(
    movieData.genres.map((g: { id: number; name: string }) => [g.id, g.name])
  );
  tvGenres = Object.fromEntries(
    tvData.genres.map((g: { id: number; name: string }) => [g.id, g.name])
  );
}

interface TmdbDiscoverResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  genre_ids: number[];
  vote_average: number;
  poster_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
}

interface WatchProviderResult {
  results?: {
    DE?: {
      link?: string;
      flatrate?: Array<{ provider_id: number }>;
    };
  };
}

/**
 * Liefert den titelspezifischen JustWatch-Link (aus TMDB) für Deutschland.
 * Auf der Seite sind pro Anbieter Deep-Links in die jeweilige App/Website.
 */
export async function getTitleWatchLink(
  id: number,
  type: 'movie' | 'series'
): Promise<string | null> {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const res = await fetch(
      `${BASE_URL}/${endpoint}/${id}/watch/providers`,
      { headers }
    );
    const data: WatchProviderResult = await res.json();
    return data.results?.DE?.link ?? null;
  } catch {
    return null;
  }
}

async function getProviders(
  id: number,
  type: 'movie' | 'tv'
): Promise<string[]> {
  const res = await fetch(
    `${BASE_URL}/${type}/${id}/watch/providers`,
    { headers }
  );
  const data: WatchProviderResult = await res.json();
  const flatrate = data.results?.DE?.flatrate ?? [];

  return flatrate
    .map((p) => findProviderByTmdbId(p.provider_id))
    .filter(Boolean)
    .map((p) => p!.id);
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Cache total pages per provider combo to know the range for random pages
const totalPagesCache: Record<string, { movie: number; tv: number }> = {};

async function getTotalPages(
  providerParam: string,
  languageParam: string,
  movieGenreParam: string,
  tvGenreParam: string,
  skipMovie: boolean,
  skipTv: boolean
): Promise<{ movie: number; tv: number }> {
  const cacheKey = `${providerParam}|${languageParam}|${movieGenreParam}|${tvGenreParam}`;
  if (totalPagesCache[cacheKey]) return totalPagesCache[cacheKey];

  const langFilter = languageParam ? `&with_original_language=${languageParam}` : '';

  const moviePromise = skipMovie
    ? Promise.resolve({ total_pages: 0 })
    : fetch(
        `${BASE_URL}/discover/movie?language=${LANGUAGE}&watch_region=${WATCH_REGION}&with_watch_providers=${providerParam}&with_watch_monetization_types=flatrate&page=1&vote_count.gte=10${langFilter}${movieGenreParam}`,
        { headers }
      ).then((r) => r.json());

  const tvPromise = skipTv
    ? Promise.resolve({ total_pages: 0 })
    : fetch(
        `${BASE_URL}/discover/tv?language=${LANGUAGE}&watch_region=${WATCH_REGION}&with_watch_providers=${providerParam}&with_watch_monetization_types=flatrate&page=1&vote_count.gte=10${langFilter}${tvGenreParam}`,
        { headers }
      ).then((r) => r.json());

  const [movieData, tvData] = await Promise.all([moviePromise, tvPromise]);

  // TMDB caps at 500 pages
  const result = {
    movie: Math.min(movieData.total_pages ?? 1, 500),
    tv: Math.min(tvData.total_pages ?? 1, 500),
  };

  totalPagesCache[cacheKey] = result;
  return result;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface Credits {
  cast: CastMember[];
  director: string | null;
}

const creditsCache: Record<string, Credits> = {};

/** Holt Schauspieler-Liste + Regisseur(in) für einen Film oder eine Serie. */
export async function getCredits(
  id: number,
  type: 'movie' | 'series'
): Promise<Credits> {
  const cacheKey = `${type}-${id}`;
  if (creditsCache[cacheKey]) return creditsCache[cacheKey];

  const endpoint = type === 'movie' ? 'movie' : 'tv';

  try {
    const res = await fetch(
      `${BASE_URL}/${endpoint}/${id}/credits?language=${LANGUAGE}`,
      { headers }
    );
    const data = await res.json();

    const cast: CastMember[] = (data.cast ?? [])
      .slice(0, 15)
      .map((c: { id: number; name: string; character: string; profile_path: string | null }) => ({
        id: c.id,
        name: c.name,
        character: c.character || '',
        profileUrl: c.profile_path
          ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}`
          : null,
      }));

    // Für TV: "created_by" ist häufig auch eine Quelle; wir schauen zuerst in crew
    const crewArr = (data.crew ?? []) as Array<{
      job?: string;
      department?: string;
      name: string;
    }>;
    let director: string | null = null;
    if (type === 'movie') {
      const dir = crewArr.find((c) => c.job === 'Director');
      director = dir?.name ?? null;
    } else {
      // Bei Serien: Creator oder Executive Producer
      const creator = crewArr.find(
        (c) => c.job === 'Creator' || c.job === 'Executive Producer'
      );
      director = creator?.name ?? null;
    }

    const result: Credits = { cast, director };
    creditsCache[cacheKey] = result;
    return result;
  } catch (err) {
    console.error('Failed to load credits:', err);
    return { cast: [], director: null };
  }
}

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  size?: number;
  published_at?: string;
}

const trailerCache: Record<string, string | null> = {};

/** Holt den YouTube-Key für den besten verfügbaren Trailer (DE, dann EN-Fallback). */
export async function getTrailerKey(
  id: number,
  type: 'movie' | 'series'
): Promise<string | null> {
  const cacheKey = `${type}-${id}`;
  if (cacheKey in trailerCache) return trailerCache[cacheKey];

  const endpoint = type === 'movie' ? 'movie' : 'tv';

  async function fetchVideos(lang: string): Promise<TmdbVideo[]> {
    const res = await fetch(
      `${BASE_URL}/${endpoint}/${id}/videos?language=${lang}`,
      { headers }
    );
    const data = await res.json();
    return (data.results as TmdbVideo[]) ?? [];
  }

  function pickBest(videos: TmdbVideo[]): TmdbVideo | null {
    const yt = videos.filter((v) => v.site === 'YouTube');
    const priority = ['Trailer', 'Teaser', 'Clip'];
    for (const t of priority) {
      const official = yt.find((v) => v.type === t && v.official);
      if (official) return official;
      const any = yt.find((v) => v.type === t);
      if (any) return any;
    }
    return yt[0] || null;
  }

  try {
    let videos = await fetchVideos('de-DE');
    let best = pickBest(videos);
    if (!best) {
      videos = await fetchVideos('en-US');
      best = pickBest(videos);
    }
    const key = best?.key ?? null;
    trailerCache[cacheKey] = key;
    return key;
  } catch (err) {
    console.error('Failed to load trailer:', err);
    trailerCache[cacheKey] = null;
    return null;
  }
}

export async function discoverMovies(
  selectedProviderIds: string[],
  selectedLanguages: string[] = [],
  selectedGenres: string[] = [],
): Promise<Movie[]> {
  await loadGenres();

  const tmdbIds = getTmdbProviderIds(selectedProviderIds);
  if (tmdbIds.length === 0) return [];

  const providerParam = tmdbIds.join('|');
  // TMDB only supports one language per request, so we pick a random one each batch
  // Empty array = no filter (all languages)
  const languageParam = selectedLanguages.length > 0
    ? selectedLanguages[Math.floor(Math.random() * selectedLanguages.length)]
    : '';
  const langFilter = languageParam ? `&with_original_language=${languageParam}` : '';

  const movieGenre = buildGenreParam(selectedGenres, 'movie');
  const tvGenre = buildGenreParam(selectedGenres, 'tv');
  // Wenn User Genres gewählt hat, aber keines auf diesen Typ passt, Typ komplett überspringen
  const skipMovie = movieGenre.hasSelection && !movieGenre.hasMatches;
  const skipTv = tvGenre.hasSelection && !tvGenre.hasMatches;

  // Get total pages to pick random ones
  const totalPages = await getTotalPages(
    providerParam,
    languageParam,
    movieGenre.param,
    tvGenre.param,
    skipMovie,
    skipTv
  );
  const randomMoviePage = Math.floor(Math.random() * Math.max(totalPages.movie, 1)) + 1;
  const randomTvPage = Math.floor(Math.random() * Math.max(totalPages.tv, 1)) + 1;

  const moviePromise = skipMovie || totalPages.movie === 0
    ? Promise.resolve({ results: [] as TmdbDiscoverResult[] })
    : fetch(
        `${BASE_URL}/discover/movie?language=${LANGUAGE}&watch_region=${WATCH_REGION}&with_watch_providers=${providerParam}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${randomMoviePage}&vote_count.gte=10${langFilter}${movieGenre.param}`,
        { headers }
      ).then((r) => r.json());

  const tvPromise = skipTv || totalPages.tv === 0
    ? Promise.resolve({ results: [] as TmdbDiscoverResult[] })
    : fetch(
        `${BASE_URL}/discover/tv?language=${LANGUAGE}&watch_region=${WATCH_REGION}&with_watch_providers=${providerParam}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=${randomTvPage}&vote_count.gte=10${langFilter}${tvGenre.param}`,
        { headers }
      ).then((r) => r.json());

  const [movieData, tvData] = await Promise.all([moviePromise, tvPromise]);

  const movieItems: TmdbDiscoverResult[] = movieData.results ?? [];
  const tvItems: TmdbDiscoverResult[] = tvData.results ?? [];

  // Combine and shuffle randomly
  const combined: Array<{ item: TmdbDiscoverResult; type: 'movie' | 'series' }> = shuffle([
    ...movieItems.map((item) => ({ item, type: 'movie' as const })),
    ...tvItems.map((item) => ({ item, type: 'series' as const })),
  ]);

  // Filter out items without poster
  const withPoster = combined.filter((c) => c.item.poster_path);

  // Fetch providers for each (batch in groups of 5 for speed)
  const movies: Movie[] = [];
  const batchSize = 5;

  for (let i = 0; i < withPoster.length; i += batchSize) {
    const batch = withPoster.slice(i, i + batchSize);
    const providerResults = await Promise.all(
      batch.map((c) =>
        getProviders(c.item.id, c.type === 'movie' ? 'movie' : 'tv')
      )
    );

    for (let j = 0; j < batch.length; j++) {
      const { item, type } = batch[j];
      const itemProviders = providerResults[j];

      // Only include if at least one selected provider
      if (itemProviders.length === 0) continue;

      const genreMap = type === 'movie' ? movieGenres : tvGenres;
      const year = type === 'movie'
        ? parseInt(item.release_date?.slice(0, 4) || '0')
        : parseInt(item.first_air_date?.slice(0, 4) || '0');

      movies.push({
        id: item.id,
        title: (type === 'movie' ? item.title : item.name) || 'Unbekannt',
        originalTitle: type === 'movie' ? item.original_title : item.original_name,
        type,
        year,
        genres: item.genre_ids.map((id) => genreMap[id] || 'Unbekannt').slice(0, 3),
        rating: Math.round(item.vote_average * 10) / 10,
        posterUrl: `${TMDB_IMAGE_BASE}${POSTER_SIZE}${item.poster_path}`,
        overview: item.overview || 'Keine Beschreibung verfügbar.',
        providers: itemProviders,
      });
    }
  }

  return movies;
}
