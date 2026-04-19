import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { providers } from '../data/providers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faStar,
  faHeart,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { loadFriendWatchlist } from '../services/friendsService';
import { createParty } from '../services/partyService';
import { EmptyState } from '../components/EmptyState';
import { trackPartyCreate } from '../services/analytics';
import type { WatchlistEntry, UserProfile } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import confetti from 'canvas-confetti';
import { hapticSuccess } from '../services/haptics';

export function FriendDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const myWatchlist = useStore((s) => s.watchlist);
  const selectedProviders = useStore((s) => s.selectedProviders);
  const selectedLanguages = useStore((s) => s.selectedLanguages);
  const selectedGenres = useStore((s) => s.selectedGenres);
  const [creatingParty, setCreatingParty] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendWatchlist, setFriendWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'matches' | 'watchlist'>('matches');
  const [pulseMatches, setPulseMatches] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (!uid) return;

    async function load() {
      setLoading(true);
      try {
        // Profil laden
        const ref = doc(db, 'users', uid!);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            uid: uid!,
            displayName: data.displayName || 'Unbekannt',
            photoURL: data.photoURL || null,
            friendCode: data.friendCode || '',
          });
        }

        // Watchlist laden
        const wl = await loadFriendWatchlist(uid!);
        setFriendWatchlist(wl);
      } catch (err) {
        console.error('Failed to load friend detail:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [uid]);

  // Gemeinsam schauen: Schnittmenge der unwatched Watchlist-IDs
  // MUSS vor den early returns stehen, damit die Hook-Reihenfolge stabil bleibt
  const myUnwatchedIds = new Set(
    (myWatchlist ?? []).filter((w) => !w.watched).map((w) => w.movie.id)
  );
  const matches = friendWatchlist.filter(
    (w) => !w.watched && myUnwatchedIds.has(w.movie.id)
  );

  function celebrateMatches() {
    if (matches.length === 0) return;
    hapticSuccess();
    setPulseMatches(true);
    setTimeout(() => setPulseMatches(false), 800);

    // Konfetti in WatchTwin Farben
    const colors = ['#f11885', '#f74da5', '#4a2dd4', '#a78bfa'];
    const end = Date.now() + 600;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // Auto-celebrate the first time we land on the matches tab with results
  // MUSS vor den early returns stehen (Rules of Hooks)
  useEffect(() => {
    if (
      !loading &&
      tab === 'matches' &&
      matches.length > 0 &&
      !celebratedRef.current
    ) {
      celebratedRef.current = true;
      celebrateMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, tab, matches.length]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-wt-surface border-t-wt-pink" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="text-gray-400">Profil nicht gefunden.</p>
        <button
          onClick={() => navigate('/friends')}
          className="mt-4 text-sm text-wt-pink"
        >
          Zurück
        </button>
      </div>
    );
  }

  const displayList = tab === 'matches' ? matches : friendWatchlist;

  async function handleStartParty() {
    if (!user || !profile) return;
    if (selectedProviders.length === 0) {
      alert('Bitte wähle erst mindestens einen Streaming-Dienst im Profil aus.');
      return;
    }
    setCreatingParty(true);
    try {
      const partyId = await createParty({
        hostUid: user.uid,
        hostName: user.displayName || 'Unbekannt',
        guestUid: profile.uid,
        guestName: profile.displayName,
        providers: selectedProviders,
        languages: selectedLanguages,
        genres: selectedGenres,
      });
      trackPartyCreate();
      navigate(`/party/${partyId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Party konnte nicht gestartet werden';
      alert(msg);
    } finally {
      setCreatingParty(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/friends')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-white"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="flex items-center gap-2">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-wt-pink/20 text-xs font-bold text-wt-pink">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-lg font-bold text-white">{profile.displayName}</h1>
        </div>
      </div>

      {/* Swipe-Party CTA */}
      <div className="px-4 pb-3">
        <button
          onClick={handleStartParty}
          disabled={creatingParty}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faBolt} className={creatingParty ? 'animate-pulse' : ''} />
          {creatingParty ? 'Starte Party…' : `Swipe-Party mit ${profile.displayName}`}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-gray-500">
          Beide swipen gleichzeitig — bei Match gibt's Konfetti 🎉
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-lg bg-wt-surface p-1">
          <button
            onClick={() => {
              setTab('matches');
              celebrateMatches();
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              tab === 'matches'
                ? 'bg-gradient-to-r from-wt-purple to-wt-pink text-white shadow-md shadow-wt-pink/20'
                : 'text-gray-400 hover:text-white'
            } ${pulseMatches ? 'animate-pulse scale-105' : ''}`}
          >
            {matches.length > 0 && (
              <FontAwesomeIcon icon={faHeart} className="text-[10px]" />
            )}
            Gemeinsam ({matches.length})
          </button>
          <button
            onClick={() => setTab('watchlist')}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'watchlist'
                ? 'bg-wt-pink text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Watchlist ({friendWatchlist.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {displayList.length === 0 ? (
          tab === 'matches' ? (
            <EmptyState
              emoji="🎯"
              iconColor="purple"
              title="Noch keine Matches"
              description={`Du und ${profile.displayName} habt noch keinen gemeinsamen Titel auf der Watchlist. Startet eine Swipe-Party, um schnell welche zu finden!`}
              action={{
                label: 'Swipe-Party starten',
                onClick: handleStartParty,
              }}
              secondaryAction={{
                label: `${profile.displayName}s Watchlist ansehen`,
                onClick: () => setTab('watchlist'),
              }}
            />
          ) : (
            <EmptyState
              emoji="📭"
              iconColor="sky"
              title={`${profile.displayName} hat noch nichts`}
              description="Die Watchlist deines Freundes ist noch leer. Vielleicht startet ihr zusammen eine Swipe-Party?"
              action={{
                label: 'Swipe-Party starten',
                onClick: handleStartParty,
              }}
            />
          )
        ) : (
          <div className="space-y-3">
            {displayList.map(({ movie, watched, isFavorite }) => {
              const movieProviders = providers.filter((p) =>
                movie.providers.includes(p.id)
              );
              const isMatch = myUnwatchedIds.has(movie.id);
              return (
                <div
                  key={movie.id}
                  className={`flex gap-3 rounded-xl p-3 ${
                    isMatch && tab === 'watchlist'
                      ? 'bg-wt-pink/10 border border-wt-pink/30'
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
                        {movie.title}
                        {isMatch && tab === 'watchlist' && (
                          <span className="rounded bg-wt-pink/20 px-1.5 py-0.5 text-[10px] font-medium text-wt-pink">
                            Match
                          </span>
                        )}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <FontAwesomeIcon icon={faStar} className="text-wt-purple-lighter text-[10px]" />
                        <span>{movie.rating}</span>
                        <span>{movie.year}</span>
                        <span>{movie.type === 'movie' ? 'Film' : 'Serie'}</span>
                        {watched && <span className="text-green-400">Gesehen</span>}
                        {isFavorite && <span className="text-wt-purple-light">Favorit</span>}
                      </div>
                      <div className="mt-1 flex gap-1">
                        {movieProviders.map((p) => (
                          <span
                            key={p.id}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: p.color }}
                          >
                            <img src={p.logo} alt={p.name} className="h-3 w-3 rounded-sm" />
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
