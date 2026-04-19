import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Movie, SwipeParty } from '../types';
import { discoverMovies } from './tmdb';

// ── Party erstellen ──────────────────────────────────────────

/**
 * Erstellt eine neue Swipe-Party. Host lädt die gemeinsame Filmauswahl anhand
 * seiner aktuellen Filter. Guest tritt dann bei.
 */
export async function createParty(params: {
  hostUid: string;
  hostName: string;
  guestUid: string;
  guestName: string;
  providers: string[];
  languages: string[];
  genres: string[];
}): Promise<string> {
  // Deck vorladen (2 Runden für ~40 Titel)
  const [batch1, batch2] = await Promise.all([
    discoverMovies(params.providers, params.languages, params.genres),
    discoverMovies(params.providers, params.languages, params.genres),
  ]);
  const seen = new Set<number>();
  const movies: Movie[] = [];
  for (const m of [...batch1, ...batch2]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    movies.push(m);
    if (movies.length >= 40) break;
  }

  if (movies.length === 0) {
    throw new Error('Keine Filme gefunden — bitte Filter anpassen.');
  }

  const ref = await addDoc(collection(db, 'parties'), {
    hostUid: params.hostUid,
    hostName: params.hostName,
    guestUid: params.guestUid,
    guestName: params.guestName,
    status: 'waiting',
    movies,
    swipes: {},
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function acceptParty(partyId: string): Promise<void> {
  const ref = doc(db, 'parties', partyId);
  await updateDoc(ref, { status: 'active' });
}

export async function endParty(partyId: string): Promise<void> {
  const ref = doc(db, 'parties', partyId);
  await updateDoc(ref, { status: 'ended' });
}

// ── Swipe speichern ──────────────────────────────────────────

export async function submitPartySwipe(
  partyId: string,
  uid: string,
  movieId: number,
  direction: 'like' | 'pass'
): Promise<void> {
  const ref = doc(db, 'parties', partyId);
  await setDoc(
    ref,
    { swipes: { [uid]: { [String(movieId)]: direction } } },
    { merge: true }
  );
}

export async function resetPartySwipes(
  partyId: string,
  uid: string
): Promise<void> {
  const ref = doc(db, 'parties', partyId);
  await updateDoc(ref, { [`swipes.${uid}`]: deleteField() });
}

// ── Live-Listener ────────────────────────────────────────────

export function listenToParty(
  partyId: string,
  cb: (party: SwipeParty | null) => void
): () => void {
  const ref = doc(db, 'parties', partyId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    cb({ id: snap.id, ...snap.data() } as SwipeParty);
  });
}

/** Alle aktiven Parties, in denen dieser User Gast oder Host ist. */
export function listenToMyParties(
  uid: string,
  cb: (parties: SwipeParty[]) => void
): () => void {
  const qGuest = query(
    collection(db, 'parties'),
    where('guestUid', '==', uid),
    where('status', 'in', ['waiting', 'active'])
  );
  const qHost = query(
    collection(db, 'parties'),
    where('hostUid', '==', uid),
    where('status', 'in', ['waiting', 'active'])
  );

  const cache: Record<string, SwipeParty[]> = { g: [], h: [] };
  function emit() {
    const byId = new Map<string, SwipeParty>();
    [...cache.g, ...cache.h].forEach((p) => byId.set(p.id, p));
    cb(Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt));
  }

  const unsubG = onSnapshot(qGuest, (snap) => {
    cache.g = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SwipeParty);
    emit();
  });
  const unsubH = onSnapshot(qHost, (snap) => {
    cache.h = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SwipeParty);
    emit();
  });

  return () => {
    unsubG();
    unsubH();
  };
}

// ── Matches berechnen ────────────────────────────────────────

export function computeMatches(party: SwipeParty): Movie[] {
  const hostSwipes = party.swipes?.[party.hostUid] ?? {};
  const guestSwipes = party.swipes?.[party.guestUid] ?? {};
  return party.movies.filter(
    (m) =>
      hostSwipes[String(m.id)] === 'like' &&
      guestSwipes[String(m.id)] === 'like'
  );
}

export async function getParty(partyId: string): Promise<SwipeParty | null> {
  const ref = doc(db, 'parties', partyId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SwipeParty;
}
