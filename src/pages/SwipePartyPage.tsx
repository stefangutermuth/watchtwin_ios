import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faHeart,
  faArrowLeft,
  faUsers,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { SwipeCard } from '../components/SwipeCard';
import { MovieDetailModal } from '../components/MovieDetailModal';
import { useAuth } from '../contexts/AuthContext';
import {
  listenToParty,
  acceptParty,
  submitPartySwipe,
  computeMatches,
  endParty,
} from '../services/partyService';
import type { SwipeParty, Movie, SwipeDirection } from '../types';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';
import { trackPartyMatch } from '../services/analytics';

export function SwipePartyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [party, setParty] = useState<SwipeParty | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<Movie | null>(null);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const seenMatchesRef = useRef<Set<number>>(new Set());

  // Listener
  useEffect(() => {
    if (!id) return;
    const unsub = listenToParty(id, (p) => {
      setParty(p);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  // Host auto-accepts when guest joined? No: host created; status changes to 'active' when guest accepts.
  // If you're the guest and status is 'waiting', accept automatically when page opens
  useEffect(() => {
    if (!party || !user) return;
    if (party.status === 'waiting' && user.uid === party.guestUid) {
      acceptParty(party.id).catch(console.error);
    }
  }, [party, user]);

  // Detect new matches for live celebration
  useEffect(() => {
    if (!party) return;
    const matches = computeMatches(party);
    for (const m of matches) {
      if (!seenMatchesRef.current.has(m.id)) {
        seenMatchesRef.current.add(m.id);
        // Only celebrate new matches after initial mount to avoid mass-fire
        if (seenMatchesRef.current.size > matches.length - 1) {
          triggerMatchCelebration(m);
        }
      }
    }
  }, [party]);

  function triggerMatchCelebration(movie: Movie) {
    setMatchPopup(movie);
    hapticSuccess();
    trackPartyMatch();
    const colors = ['#f11885', '#f74da5', '#4a2dd4', '#a78bfa'];
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.5 },
      colors,
      disableForReducedMotion: true,
    });
  }

  async function handleSwipe(direction: SwipeDirection, movie: Movie) {
    if (!party || !user) return;
    const dir: 'like' | 'pass' =
      direction === 'right' || direction === 'up' ? 'like' : 'pass';
    if (dir === 'like') hapticMedium();
    else hapticLight();
    await submitPartySwipe(party.id, user.uid, movie.id, dir).catch(
      console.error
    );
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="text-5xl animate-bounce">🍿</span>
        <p className="mt-3 text-sm text-gray-400 animate-pulse">Party wird geladen...</p>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="text-gray-400">Party nicht gefunden.</p>
        <button
          onClick={() => navigate('/friends')}
          className="mt-4 text-sm text-wt-pink"
        >
          Zurück zu Freunden
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isHost = user.uid === party.hostUid;
  const otherName = isHost ? party.guestName : party.hostName;
  const mySwipes = party.swipes?.[user.uid] ?? {};
  const otherSwipes = party.swipes?.[isHost ? party.guestUid : party.hostUid] ?? {};
  const matches = computeMatches(party);

  // Waiting state (for host before guest accepts)
  if (party.status === 'waiting' && isHost) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <FontAwesomeIcon
          icon={faUsers}
          className="text-5xl text-wt-pink animate-pulse"
        />
        <h2 className="mt-4 text-xl font-bold text-white">
          Warte auf {party.guestName}…
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Sobald {party.guestName} beitritt, geht's los!
        </p>
        <button
          onClick={() => {
            endParty(party.id);
            navigate('/friends');
          }}
          className="mt-6 text-xs text-gray-500 underline"
        >
          Abbrechen
        </button>
      </div>
    );
  }

  if (party.status === 'ended') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="text-gray-400">Diese Party ist beendet.</p>
        <button
          onClick={() => navigate('/friends')}
          className="mt-4 text-sm text-wt-pink"
        >
          Zurück
        </button>
      </div>
    );
  }

  // Filter: nur Filme die ICH noch nicht geswiped habe
  const remaining = party.movies.filter(
    (m) => !(String(m.id) in mySwipes)
  );
  const currentMovie = remaining[0];
  const mySwipeCount = Object.keys(mySwipes).length;
  const otherSwipeCount = Object.keys(otherSwipes).length;

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
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">
            Swipe-Party mit {otherName}
          </h1>
          <p className="text-[11px] text-gray-400">
            Du: {mySwipeCount}/{party.movies.length} · {otherName}:{' '}
            {otherSwipeCount}/{party.movies.length}
          </p>
        </div>
        {matches.length > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-wt-pink/20 px-3 py-1 text-xs font-bold text-wt-pink">
            <FontAwesomeIcon icon={faHeart} className="text-[10px]" />
            {matches.length}
          </div>
        )}
      </div>

      {/* Swipe area or Empty state */}
      <div className="relative flex-1 px-4 pb-4">
        {currentMovie ? (
          <div className="relative h-full">
            <SwipeCard
              key={currentMovie.id}
              movie={currentMovie}
              onSwipe={(dir) => handleSwipe(dir, currentMovie)}
              isTop
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FontAwesomeIcon
              icon={faCheck}
              className="text-5xl text-green-400"
            />
            <h2 className="mt-4 text-lg font-bold text-white">
              Du bist durch!
            </h2>
            <p className="mt-2 max-w-xs text-sm text-gray-400">
              {otherSwipeCount < party.movies.length
                ? `Warte noch auf ${otherName}…`
                : 'Alle fertig — schaut euch die Matches an!'}
            </p>
          </div>
        )}
      </div>

      {/* Matches strip */}
      {matches.length > 0 && (
        <div className="px-4 pb-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-wt-pink">
            💖 Gemeinsame Matches ({matches.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => setDetailMovie(m)}
                className="shrink-0 overflow-hidden rounded-lg ring-2 ring-wt-pink/60 transition-transform active:scale-95"
              >
                <img
                  src={m.posterUrl}
                  alt={m.title}
                  title={m.title}
                  className="h-20 w-14 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {currentMovie && (
        <div className="flex items-center justify-center gap-4 pb-4">
          <button
            onClick={() => handleSwipe('left', currentMovie)}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500/50 bg-wt-card text-red-500 shadow-lg transition-transform hover:scale-110 active:scale-95"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>
          <button
            onClick={() => handleSwipe('right', currentMovie)}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500/50 bg-wt-card text-green-500 shadow-lg transition-transform hover:scale-110 active:scale-95"
          >
            <FontAwesomeIcon icon={faHeart} className="text-xl" />
          </button>
        </div>
      )}

      {/* Movie detail modal */}
      <MovieDetailModal
        movie={detailMovie}
        onClose={() => setDetailMovie(null)}
        hideActions
      />

      {/* Match popup */}
      <AnimatePresence>
        {matchPopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMatchPopup(null)}
          >
            <motion.div
              className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-gradient-to-br from-wt-purple/40 via-wt-card to-wt-pink/30 p-6 text-center shadow-2xl"
              initial={{ scale: 0.5, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-wt-pink">
                Match!
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Ihr wollt beide…
              </h2>
              <img
                src={matchPopup.posterUrl}
                alt={matchPopup.title}
                className="mt-4 h-56 rounded-xl object-cover shadow-xl"
              />
              <p className="mt-3 text-lg font-bold text-white">
                {matchPopup.title}
              </p>
              <button
                onClick={() => setMatchPopup(null)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink py-3 text-sm font-bold text-white"
              >
                Weiter swipen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
