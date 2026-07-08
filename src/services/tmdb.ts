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
  // Beide Caches prüfen — sonst bleibt der TV-Cache dauerhaft leer, wenn
  // beim ersten Versuch nur der Movie-Teil durchkam.
  if (
    Object.keys(movieGenres).length > 0 &&
    Object.keys(tvGenres).length > 0
  ) {
    return;
  }

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${BASE_URL}/genre/movie/list?language=${LANGUAGE}`, { headers }),
      fetch(`${BASE_URL}/genre/tv/list?language=${LANGUAGE}`, { headers }),
    ]);

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    // Bei Rate-Limit/Fehler liefert TMDB {status_code,...} ohne genres —
    // dann Cache unangetastet lassen (nächster Aufruf versucht es erneut).
    if (!Array.isArray(movieData?.genres) || !Array.isArray(tvData?.genres)) {
      console.warn('[TMDB] Genre-Antwort unvollständig — überspringe Cache');
      return;
    }

    // Atomar setzen: entweder beide Caches oder keinen
    movieGenres = Object.fromEntries(
      movieData.genres.map((g: { id: number; name: string }) => [g.id, g.name])
    );
    tvGenres = Object.fromEntries(
      tvData.genres.map((g: { id: number; name: string }) => [g.id, g.name])
    );
  } catch (err) {
    console.warn('[TMDB] Genre-Laden fehlgeschlagen:', err);
  }
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

// Provider-Cache: Titel wiederholen sich über Sessions/Filter — ohne Cache
// verursachte jede Deck-Nachladung bis zu 40 einzelne /watch/providers-Calls
// (100-Swipe-Session ≈ 250+ Requests). Streaming-Verfügbarkeit ändert sich
// selten; ein In-Memory-Cache pro App-Lauf reicht.
const providersCache = new Map<string, string[]>();

async function getProviders(
  id: number,
  type: 'movie' | 'tv'
): Promise<string[]> {
  const cacheKey = `${type}:${id}`;
  const cached = providersCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE_URL}/${type}/${id}/watch/providers`,
      { headers }
    );
    const data: WatchProviderResult = await res.json();
    const flatrate = data.results?.DE?.flatrate ?? [];

    const result = flatrate
      .map((p) => findProviderByTmdbId(p.provider_id))
      .filter(Boolean)
      .map((p) => p!.id);

    providersCache.set(cacheKey, result);
    return result;
  } catch (err) {
    // Fehler NICHT cachen — nächster Versuch darf es erneut probieren
    console.warn('[TMDB] Provider-Lookup fehlgeschlagen:', err);
    return [];
  }
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

/**
 * TMDB-Trending: Top-Filme + Serien dieser Woche.
 * Optional gefiltert nach User-Streaming-Providern (Client-Side, da TMDB-Trending
 * den `with_watch_providers`-Param nicht akzeptiert).
 *
 * @param selectedProviderIds  IDs der vom User gewählten Streaming-Anbieter
 *                              (leer = keine Provider-Filterung)
 * @param limit  Maximale Anzahl Ergebnisse (default 20)
 */
export async function getTrendingThisWeek(
  selectedProviderIds: string[] = [],
  limit = 20
): Promise<Movie[]> {
  try {
    // Im try-Block: loadGenres ist zwar selbst abgesichert, aber so bleibt
    // garantiert keine Exception unbehandelt Richtung UI.
    await loadGenres();

    const [movieData, tvData] = await Promise.all([
      fetch(`${BASE_URL}/trending/movie/week?language=${LANGUAGE}`, { headers }).then(
        (r) => r.json()
      ),
      fetch(`${BASE_URL}/trending/tv/week?language=${LANGUAGE}`, { headers }).then(
        (r) => r.json()
      ),
    ]);

    const combined: Array<{
      item: TmdbDiscoverResult;
      type: 'movie' | 'series';
      rank: number;
    }> = [
      ...(movieData.results ?? []).map((item: TmdbDiscoverResult, i: number) => ({
        item,
        type: 'movie' as const,
        rank: i,
      })),
      ...(tvData.results ?? []).map((item: TmdbDiscoverResult, i: number) => ({
        item,
        type: 'series' as const,
        rank: i,
      })),
    ];

    // Trend-Rang des Endpoints als Primär-Sortierung beibehalten (das IST
    // das Feature „Neu & Trending"), vote_average nur als Tiebreaker.
    // Movie/Serie mit gleichem Rang wechseln sich dadurch ab.
    const withPoster = combined
      .filter((c) => c.item.poster_path)
      .sort(
        (a, b) => a.rank - b.rank || b.item.vote_average - a.item.vote_average
      )
      .slice(0, limit + 10); // ein paar mehr fetchen, da Provider-Filter durch sein wird

    // Provider pro Item batch-fetchen (5er Gruppen)
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

        // Wenn User Provider gewählt hat: nur diese matchen lassen.
        // Wenn nicht: alle Items zulassen (auch ohne Provider — manche Filme sind nur Kino).
        if (selectedProviderIds.length > 0) {
          const hasMatch = itemProviders.some((p) =>
            selectedProviderIds.includes(p)
          );
          if (!hasMatch) continue;
        }

        const genreMap = type === 'movie' ? movieGenres : tvGenres;
        const year =
          type === 'movie'
            ? parseInt(item.release_date?.slice(0, 4) || '0')
            : parseInt(item.first_air_date?.slice(0, 4) || '0');

        movies.push({
          id: item.id,
          title: (type === 'movie' ? item.title : item.name) || 'Unbekannt',
          originalTitle:
            type === 'movie' ? item.original_title : item.original_name,
          type,
          year,
          genres: item.genre_ids
            .map((id) => genreMap[id] || 'Unbekannt')
            .slice(0, 3),
          rating: Math.round(item.vote_average * 10) / 10,
          posterUrl: `${TMDB_IMAGE_BASE}${POSTER_SIZE}${item.poster_path}`,
          overview: item.overview || 'Keine Beschreibung verfügbar.',
          providers: itemProviders,
        });

        if (movies.length >= limit) break;
      }
      if (movies.length >= limit) break;
    }

    return movies;
  } catch (err) {
    console.error('[TMDB] Trending fehlgeschlagen:', err);
    return [];
  }
}
