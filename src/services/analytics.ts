import { logEvent, setUserId as faSetUserId } from 'firebase/analytics';
import * as firebaseModule from './firebase';

/**
 * Zentraler Analytics-Service.
 * Nutzt Firebase Analytics. Events werden ignoriert wenn Analytics nicht verfügbar ist.
 *
 * Event-Naming-Konvention:
 * - snake_case
 * - Verb_Substantiv (z.B. `swipe_like`, `party_create`)
 */

function track(name: string, params?: Record<string, unknown>) {
  const fa = firebaseModule.analytics;
  if (!fa) return;
  try {
    logEvent(fa, name, params);
  } catch (err) {
    console.warn(`[Analytics] ${name} failed:`, err);
  }
}

// ── User ─────────────────────────────────────────────────────

export function identifyUser(uid: string | null) {
  const fa = firebaseModule.analytics;
  if (!fa) return;
  try {
    faSetUserId(fa, uid);
  } catch (err) {
    console.warn('[Analytics] identifyUser failed:', err);
  }
}

// ── Swipe-Events ─────────────────────────────────────────────

type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export function trackSwipe(direction: SwipeDirection, movieId: number, type: 'movie' | 'series') {
  const actionMap: Record<SwipeDirection, string> = {
    right: 'like',
    left: 'nope',
    up: 'super_like',
    down: 'seen',
  };
  track(`swipe_${actionMap[direction]}`, { movie_id: movieId, content_type: type });
}

// ── Watchlist ────────────────────────────────────────────────

export function trackWatchlistRemove(movieId: number) {
  track('watchlist_remove', { movie_id: movieId });
}

export function trackWatchlistMarkSeen(movieId: number) {
  track('watchlist_mark_seen', { movie_id: movieId });
}

// ── Freunde ──────────────────────────────────────────────────

export function trackFriendRequestSent() {
  track('friend_request_sent');
}

export function trackFriendRequestAccepted() {
  track('friend_request_accepted');
}

// ── Swipe-Party ──────────────────────────────────────────────

export function trackPartyCreate() {
  track('party_create');
}

export function trackPartyMatch() {
  track('party_match');
}

export function trackPartyEnd(matches: number) {
  track('party_end', { matches });
}

// ── Monetarisierung ──────────────────────────────────────────

export function trackPremiumPurchase() {
  track('premium_purchase');
}

export function trackPremiumRestore() {
  track('premium_restore');
}

// ── Screens ──────────────────────────────────────────────────

export function trackScreenView(screenName: string) {
  track('screen_view', { screen_name: screenName });
}

// ── Onboarding ───────────────────────────────────────────────

export function trackOnboardingComplete(providerCount: number) {
  track('onboarding_complete', { provider_count: providerCount });
}

// ── Auth ─────────────────────────────────────────────────────

export function trackLogin(method: 'email' | 'google' | 'apple') {
  track('login', { method });
}

export function trackSignup(method: 'email' | 'google' | 'apple') {
  track('sign_up', { method });
}
