import type { Provider } from '../types';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
export const POSTER_SIZE = '/w500';
export const LOGO_SIZE = '/w92';

const enc = encodeURIComponent;

export const providers: Provider[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    color: '#E50914',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg`,
    tmdbId: 8,
    searchUrl: (t) => `https://www.netflix.com/search?q=${enc(t)}`,
  },
  {
    id: 'disney',
    name: 'Disney+',
    color: '#113CCF',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/97yvRBw1GzX7fXprcF80er19ot.jpg`,
    tmdbId: 337,
    searchUrl: (t) => `https://www.disneyplus.com/de-de/search/${enc(t)}`,
  },
  {
    id: 'prime',
    name: 'Prime Video',
    color: '#00A8E1',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/pvske1MyAoymrs5bguRfVqYiM9a.jpg`,
    tmdbId: 9,
    searchUrl: (t) => `https://www.amazon.de/s?k=${enc(t)}&i=instant-video`,
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    color: '#555555',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg`,
    tmdbId: 350,
    searchUrl: (t) => `https://tv.apple.com/de/search?term=${enc(t)}`,
  },
  {
    id: 'wow',
    name: 'WOW',
    color: '#5B2D8E',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/9r5zFWuYnwjzO1JrNjSbLQwUc3P.jpg`,
    tmdbId: 30,
    searchUrl: (t) => `https://www.wowtv.de/search?query=${enc(t)}`,
  },
  {
    id: 'rtlplus',
    name: 'RTL+',
    color: '#E4003A',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/jmR0t1kjzHcyV7raynzMbF87J9d.jpg`,
    tmdbId: 298,
    searchUrl: (t) => `https://plus.rtl.de/suche?q=${enc(t)}`,
  },
  {
    id: 'joyn',
    name: 'Joyn',
    color: '#1EE494',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/3tKojIkk9QpkDUeU8HgpHQ9Jb2v.jpg`,
    tmdbId: 304,
    searchUrl: (t) => `https://www.joyn.de/suche?search=${enc(t)}`,
  },
  {
    id: 'magenta',
    name: 'Magenta TV',
    color: '#E20074',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/nCsFBTEmlCMc5NA4fwPuluTz6AO.jpg`,
    tmdbId: 178,
    searchUrl: (t) => `https://www.magentatv.de/suche?q=${enc(t)}`,
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    color: '#0064FF',
    logo: `${TMDB_IMAGE_BASE}${LOGO_SIZE}/h5DcR0J2EESLitnhR8xLG1QymTE.jpg`,
    tmdbId: 531,
    searchUrl: (t) => `https://www.paramountplus.com/de/search/?q=${enc(t)}`,
  },
];

/**
 * Öffnet den Streaming-Anbieter — auf Native über Capacitor Browser,
 * im Web per window.open. Fällt auf Homepage zurück falls keine searchUrl.
 */
export async function openProvider(provider: Provider, title: string): Promise<void> {
  const url = provider.searchUrl ? provider.searchUrl(title) : `https://www.google.com/search?q=${enc(provider.name + ' ' + title)}`;
  // Capacitor-native: öffnet In-App-Browser. Web: neuer Tab.
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    }
  } catch {
    // fallback to window.open
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function getTmdbProviderIds(selectedIds: string[]): number[] {
  return providers
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.tmdbId);
}

export function findProviderByTmdbId(tmdbId: number): Provider | undefined {
  return providers.find((p) => p.tmdbId === tmdbId);
}
