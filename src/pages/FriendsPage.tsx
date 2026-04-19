import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserGroup,
  faCopy,
  faShareNodes,
  faPaperPlane,
  faCheck,
  faXmark,
  faSpinner,
  faChevronRight,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import {
  ensureUserProfile,
  findUserByFriendCode,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getPendingRequests,
  type FriendWithProfile,
} from '../services/friendsService';
import { listenToMyParties } from '../services/partyService';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { PullToRefresh } from '../components/PullToRefresh';
import { trackFriendRequestSent, trackFriendRequestAccepted } from '../services/analytics';
import type { SwipeParty } from '../types';

export function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [friendCode, setFriendCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parties, setParties] = useState<SwipeParty[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToMyParties(user.uid, setParties);
    return unsub;
  }, [user]);

  // Via Deep-Link kommender Friend-Code (?code=ABCD12) ins Input-Feld setzen
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && code.length === 6) {
      setInputCode(code.toUpperCase());
      toast.show(`Freundeshinzufügen: ${code.toUpperCase()}`, 'info');
      // Param aus URL entfernen, damit kein Refresh-Loop
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const code = await ensureUserProfile(user.uid, user.displayName, user.photoURL);
      setFriendCode(code);

      const [friendsList, pending] = await Promise.all([
        getFriends(user.uid),
        getPendingRequests(user.uid),
      ]);
      setFriends(friendsList);
      setPendingRequests(pending);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guest: Login-Prompt
  if (!user) {
    return (
      <EmptyState
        icon={faUserGroup}
        iconColor="pink"
        title="Schaut zusammen"
        description="Mit Freunden gemeinsam swipen, Matches finden und Watchparty starten — melde dich an um loszulegen."
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

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      toast.show('Code in Zwischenablage kopiert');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      toast.show('Kopieren fehlgeschlagen', 'error');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShareCode() {
    // Web-Link (universal funktioniert) + App-Code-Hinweis
    const webLink = `https://watchtwin.de/?invite=${friendCode}`;
    const shareText = `Lass uns auf WatchTwin zusammen Filme finden! Mein Code: ${friendCode}\n${webLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WatchTwin',
          text: shareText,
          url: webLink,
        });
      } catch {
        // Share abgebrochen
      }
    } else {
      handleCopyCode();
    }
  }

  async function handleSendRequest() {
    if (!inputCode.trim() || !user) return;
    const code = inputCode.trim().toUpperCase();

    if (code === friendCode) {
      setError('Das ist dein eigener Code!');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const foundUser = await findUserByFriendCode(code);
      if (!foundUser) {
        setError('Kein User mit diesem Code gefunden.');
        return;
      }
      await sendFriendRequest(user.uid, foundUser.uid);
      setSuccess(`Anfrage an ${foundUser.displayName} gesendet!`);
      toast.show(`Anfrage an ${foundUser.displayName} gesendet`);
      trackFriendRequestSent();
      setInputCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Senden';
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(friendshipId: string) {
    try {
      await acceptFriendRequest(friendshipId);
      trackFriendRequestAccepted();
      await loadData();
    } catch (err) {
      console.error('Failed to accept:', err);
    }
  }

  async function handleDecline(friendshipId: string) {
    try {
      await declineFriendRequest(friendshipId);
      await loadData();
    } catch (err) {
      console.error('Failed to decline:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="text-5xl animate-bounce">🍿</span>
        <p className="mt-4 text-gray-400 animate-pulse">Lade Freunde...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold text-white">Freunde</h1>
      </div>

      <PullToRefresh onRefresh={loadData}>
      <div className="px-4 pb-4">
        {/* Eigener Code */}
        <div className="rounded-xl bg-wt-card p-4">
          <p className="text-xs font-medium text-gray-400">Dein Freunde-Code</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex-1 rounded-lg bg-wt-surface px-4 py-2.5 text-center text-xl font-bold tracking-[0.3em] text-white">
              {friendCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-wt-surface text-gray-400 transition-colors hover:text-white"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-green-400' : ''} />
            </button>
            <button
              onClick={handleShareCode}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-wt-pink text-white"
            >
              <FontAwesomeIcon icon={faShareNodes} />
            </button>
          </div>
        </div>

        {/* Freund hinzufügen */}
        <div className="mt-4 rounded-xl bg-wt-card p-4">
          <p className="text-xs font-medium text-gray-400">Freund hinzufügen</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setError('');
                setSuccess('');
              }}
              placeholder="Code eingeben"
              maxLength={6}
              className="flex-1 rounded-lg bg-wt-surface px-4 py-2.5 text-center text-base font-bold tracking-[0.2em] text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-wt-pink"
            />
            <button
              onClick={handleSendRequest}
              disabled={sending || inputCode.length < 6}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-wt-pink text-white disabled:opacity-40"
            >
              <FontAwesomeIcon icon={sending ? faSpinner : faPaperPlane} className={sending ? 'animate-spin' : ''} />
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          {success && <p className="mt-2 text-xs text-green-400">{success}</p>}
        </div>

        {/* Aktive Parties */}
        {parties.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">
              Swipe-Parties
            </h2>
            <div className="space-y-2">
              {parties.map((p) => {
                const isHost = p.hostUid === user.uid;
                const otherName = isHost ? p.guestName : p.hostName;
                const isInvite = !isHost && p.status === 'waiting';
                const mySwipes = p.swipes?.[user.uid] ?? {};
                const mySwipeCount = Object.keys(mySwipes).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/party/${p.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-wt-purple/20 to-wt-pink/20 p-3 text-left ring-1 ring-wt-pink/30 transition-colors active:bg-wt-surface"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wt-pink/20 text-wt-pink">
                      <FontAwesomeIcon icon={faBolt} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {isInvite ? `${otherName} lädt dich ein` : `Party mit ${otherName}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {isInvite
                          ? 'Tippen um beizutreten'
                          : `${mySwipeCount} / ${p.movies.length} geswiped`}
                      </p>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="text-sm text-gray-500"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Offene Anfragen */}
        {pendingRequests.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-400">
              Offene Anfragen ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map(({ friendship, profile }) => (
                <div
                  key={friendship.id}
                  className="flex items-center gap-3 rounded-xl bg-wt-card p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wt-pink/20 text-sm font-bold text-wt-pink">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{profile.displayName}</p>
                    <p className="text-xs text-gray-400">Möchte dein Freund sein</p>
                  </div>
                  <button
                    onClick={() => handleAccept(friendship.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400"
                  >
                    <FontAwesomeIcon icon={faCheck} className="text-sm" />
                  </button>
                  <button
                    onClick={() => handleDecline(friendship.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400"
                  >
                    <FontAwesomeIcon icon={faXmark} className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Freundesliste */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-400">
            Deine Freunde ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-wt-card/50 p-6 py-10 text-center ring-1 ring-white/5">
              <span className="text-5xl animate-pulse">👋</span>
              <div>
                <p className="font-semibold text-white">
                  Noch keine Freunde dabei
                </p>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-gray-400">
                  Teile deinen Code <span className="rounded bg-wt-surface px-1.5 py-0.5 font-mono font-bold text-wt-pink">{friendCode}</span> mit einem Freund — so könnt ihr bald zusammen swipen.
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 rounded-full bg-wt-pink px-4 py-2 text-xs font-bold text-white transition-all active:scale-95"
              >
                <FontAwesomeIcon icon={faCopy} className="text-[10px]" />
                Code kopieren
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map(({ friendship, profile }) => (
                <button
                  key={friendship.id}
                  onClick={() => navigate(`/friends/${profile.uid}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-wt-card p-3 text-left transition-colors active:bg-wt-surface"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wt-pink/20 text-sm font-bold text-wt-pink">
                    {profile.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt={profile.displayName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      profile.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{profile.displayName}</p>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="text-sm text-gray-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </PullToRefresh>
    </div>
  );
}
