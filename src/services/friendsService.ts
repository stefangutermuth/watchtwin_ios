import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { checkRateLimit } from './rateLimiter';
import type { UserProfile, Friendship, WatchlistEntry } from '../types';

// ── Friend Code ──────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne I,O,0,1 (Verwechslungsgefahr)

function generateFriendCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Stellt sicher, dass der User einen friendCode hat.
 * Speichert außerdem displayName + photoURL in Firestore.
 */
export async function ensureUserProfile(
  uid: string,
  displayName: string | null,
  photoURL: string | null
): Promise<string> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = snap.data();

  // Auth-Werte updaten (überschreibt NICHT custom-Werte)
  const updates: Record<string, unknown> = {
    displayName: data?.customDisplayName || displayName || 'Unbekannt',
    photoURL: data?.customPhotoURL || photoURL || null,
    authDisplayName: displayName || null,
    authPhotoURL: photoURL || null,
  };

  if (data?.friendCode) {
    // Code existiert bereits, nur Profil updaten
    await setDoc(ref, updates, { merge: true });
    return data.friendCode as string;
  }

  // Neuen Code generieren
  const code = generateFriendCode();
  updates.friendCode = code;
  await setDoc(ref, updates, { merge: true });
  return code;
}

// ── User suchen ──────────────────────────────────────────────

export async function findUserByFriendCode(
  code: string
): Promise<UserProfile | null> {
  const q = query(
    collection(db, 'users'),
    where('friendCode', '==', code.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    displayName: data.customDisplayName || data.displayName || 'Unbekannt',
    photoURL: data.customPhotoURL || data.photoURL || null,
    friendCode: data.friendCode,
  };
}

// ── Freundschaftsanfragen ────────────────────────────────────

export async function sendFriendRequest(
  fromUid: string,
  toUid: string
): Promise<void> {
  // Rate-Limit: max 10 Anfragen pro Minute (Spam-Schutz)
  if (!checkRateLimit('friend-request', 10, 60_000)) {
    throw new Error('Zu viele Anfragen in kurzer Zeit. Bitte warte einen Moment.');
  }

  // Prüfe ob schon eine Friendship existiert
  const existing = await getExistingFriendship(fromUid, toUid);
  if (existing) {
    throw new Error('Freundschaftsanfrage existiert bereits');
  }

  const users = [fromUid, toUid].sort() as [string, string];
  await addDoc(collection(db, 'friendships'), {
    users,
    status: 'pending',
    requestedBy: fromUid,
    createdAt: Date.now(),
  });
}

export async function acceptFriendRequest(
  friendshipId: string
): Promise<void> {
  const ref = doc(db, 'friendships', friendshipId);
  await updateDoc(ref, { status: 'accepted' });
}

export async function declineFriendRequest(
  friendshipId: string
): Promise<void> {
  const ref = doc(db, 'friendships', friendshipId);
  await deleteDoc(ref);
}

export async function removeFriend(
  friendshipId: string
): Promise<void> {
  const ref = doc(db, 'friendships', friendshipId);
  await deleteDoc(ref);
}

// ── Freunde & Anfragen laden ─────────────────────────────────

async function getExistingFriendship(
  uid1: string,
  uid2: string
): Promise<Friendship | null> {
  const sorted = [uid1, uid2].sort();
  const q = query(
    collection(db, 'friendships'),
    where('users', '==', sorted)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Friendship;
}

async function loadUserProfile(uid: string): Promise<UserProfile> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = snap.data();
  return {
    uid,
    displayName: data?.customDisplayName || data?.displayName || 'Unbekannt',
    photoURL: data?.customPhotoURL || data?.photoURL || null,
    friendCode: data?.friendCode || '',
  };
}

export interface FriendWithProfile {
  friendship: Friendship;
  profile: UserProfile;
}

export async function getFriends(uid: string): Promise<FriendWithProfile[]> {
  // Firestore erlaubt kein array-contains + == auf gleiche Collection,
  // daher laden wir alle Friendships des Users
  const q = query(
    collection(db, 'friendships'),
    where('users', 'array-contains', uid)
  );
  const snap = await getDocs(q);

  const accepted = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Friendship)
    .filter((f) => f.status === 'accepted');

  // Profile parallel laden — 10x schneller als sequenziell
  return Promise.all(
    accepted.map(async (f) => {
      const friendUid = f.users[0] === uid ? f.users[1] : f.users[0];
      const profile = await loadUserProfile(friendUid);
      return { friendship: f, profile };
    })
  );
}

export async function getPendingRequests(
  uid: string
): Promise<FriendWithProfile[]> {
  const q = query(
    collection(db, 'friendships'),
    where('users', 'array-contains', uid)
  );
  const snap = await getDocs(q);

  const pending = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Friendship)
    .filter((f) => f.status === 'pending' && f.requestedBy !== uid);

  // Profile parallel laden
  return Promise.all(
    pending.map(async (f) => {
      const profile = await loadUserProfile(f.requestedBy);
      return { friendship: f, profile };
    })
  );
}

// ── Watchlist eines Freundes laden ───────────────────────────

export async function loadFriendWatchlist(
  uid: string
): Promise<WatchlistEntry[]> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.watchlist as WatchlistEntry[]) || [];
}
