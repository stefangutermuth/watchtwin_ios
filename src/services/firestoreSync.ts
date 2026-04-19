import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { deleteUser } from 'firebase/auth';
import type { WatchlistEntry } from '../types';

interface UserData {
  watchlist: WatchlistEntry[];
  skippedIds: number[];
  selectedProviders: string[];
  isPremium: boolean;
  onboardingDone: boolean;
  contentFilter: 'all' | 'movie' | 'series';
  selectedLanguages: string[];
  selectedGenres: string[];
}

/** Speichert User-Daten in Firestore */
export async function saveUserData(
  uid: string,
  data: Partial<UserData>
): Promise<void> {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
}

/** Lädt User-Daten aus Firestore */
export async function loadUserData(
  uid: string
): Promise<UserData | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserData;
}

/** Löscht User-Daten (setzt auf leer) */
export async function deleteUserData(uid: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    watchlist: [],
    skippedIds: [],
    selectedProviders: [],
    isPremium: false,
    onboardingDone: false,
    contentFilter: 'all',
    selectedLanguages: [],
    selectedGenres: [],
    updatedAt: Date.now(),
  });
}

/**
 * Vollständige Konto-Löschung:
 * - alle Firestore-Daten (User-Profil, Watchlist, Freundschaften, Parties)
 * - Firebase Auth Account
 *
 * Wirft 'auth/requires-recent-login' wenn die letzte Anmeldung zu lange her ist.
 * In dem Fall muss sich der User vorher neu anmelden (re-authenticate).
 */
export async function deleteAccountCompletely(uid: string): Promise<void> {
  // 1. Freundschaften löschen (alle, in denen UID vorkommt)
  try {
    const friendships = await getDocs(
      query(collection(db, 'friendships'), where('users', 'array-contains', uid))
    );
    await Promise.all(friendships.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('[delete] friendships:', err);
  }

  // 2. Parties löschen (Host)
  try {
    const hostParties = await getDocs(
      query(collection(db, 'parties'), where('hostUid', '==', uid))
    );
    await Promise.all(hostParties.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('[delete] host parties:', err);
  }

  // 3. User-Profil-Dokument
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn('[delete] user doc:', err);
  }

  // 4. Auth-Account löschen — kann 'requires-recent-login' werfen
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await deleteUser(auth.currentUser);
  }
}

// ── Debounced Cloud-Sync mit Max-Wait ─────────────────────────
//
// Warum beides? Pur-Debounce könnte bei Dauer-Aktivität (viele schnelle
// Swipes) Stunden lang NIE speichern, weil der Timer ständig resetted wird.
// Mit max-wait garantieren wir: spätestens alle 10s wird gespeichert.

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let firstCallAt: number | null = null;
let pendingArgs: { uid: string; data: Partial<UserData> } | null = null;

const DEBOUNCE_MS = 1000;
const MAX_WAIT_MS = 10_000;

function flushSave() {
  if (!pendingArgs) return;
  const { uid, data } = pendingArgs;
  pendingArgs = null;
  firstCallAt = null;
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  saveUserData(uid, data).catch((err) =>
    console.error('Cloud sync failed:', err)
  );
}

/**
 * Debounced Sync — wartet bis zu 1s nach letzter Änderung,
 * speichert aber spätestens nach 10s.
 */
export function debouncedSaveUserData(
  uid: string,
  data: Partial<UserData>
): void {
  pendingArgs = { uid, data };
  const now = Date.now();
  if (firstCallAt === null) firstCallAt = now;

  if (syncTimeout) clearTimeout(syncTimeout);

  const timeSinceFirst = now - firstCallAt;
  const remainingToMax = Math.max(0, MAX_WAIT_MS - timeSinceFirst);
  const delay = Math.min(DEBOUNCE_MS, remainingToMax);

  syncTimeout = setTimeout(flushSave, delay);
}
