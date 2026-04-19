/**
 * Einfacher Sliding-Window Rate-Limiter.
 * Hält die letzten Timestamps in memory — reicht für Client-Side-Spam-Schutz.
 *
 * Für echte Security-Limits sollten Firestore-Rules + Cloud-Functions verwendet werden.
 */

const windows: Record<string, number[]> = {};

/**
 * Prüft ob eine Aktion erlaubt ist. Registriert den Aufruf gleichzeitig.
 *
 * @param key   Unique Name der Aktion, z.B. 'friend-request'
 * @param max   Maximale Anzahl Aufrufe im Zeitfenster
 * @param windowMs Zeitfenster in Millisekunden
 * @returns `true` wenn erlaubt, `false` wenn limitiert
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = windows[key] ?? [];
  // Alte Einträge verwerfen
  const recent = timestamps.filter((t) => t > cutoff);

  if (recent.length >= max) {
    windows[key] = recent;
    return false;
  }

  recent.push(now);
  windows[key] = recent;
  return true;
}

/**
 * Wie lange muss man warten bis wieder erlaubt? 0 = jetzt.
 */
export function getRateLimitCooldown(key: string, windowMs: number): number {
  const timestamps = windows[key] ?? [];
  if (timestamps.length === 0) return 0;
  const oldest = timestamps[0];
  const remaining = windowMs - (Date.now() - oldest);
  return Math.max(0, remaining);
}
