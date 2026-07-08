# WatchTwin — Optimierungs- & Fix-Plan (nach Code-Review v1.2)

Stand: 2026-07-08. Basiert auf drei parallelen Code-Reviews (Korrektheit, Performance, Sicherheit).
Ziel-Release: **v1.3** (Android versionCode 6, iOS Build 30).

Reihenfolge nach Risiko/Deployment-Kopplung gegliedert. Phase 1 ist reiner Client-Code
(schnell + risikoarm), Phase 2 fasst Firestore-Rules an (braucht mehr Test), Phase 3+4
sind Performance & Politur.

---

## PHASE 1 — Kritische Client-Bugs (kein Backend, sofort shippbar)

### 1.1 Trending-Endlosschleife stoppen 🔴
**Dateien:** `src/components/TrendingRail.tsx:20-42`, `src/store/useStore.ts:294-295`

Problem: Liefert `getTrendingThisWeek` `[]` (API-Fehler oder Provider-Filter filtert alles weg),
setzt `setTrendingMovies([])` den `trendingLastFetch`-Timestamp neu → Effect-Dependency ändert
sich → `isFresh` bleibt `false` (weil `length === 0`) → sofortiger Re-Fetch → Endlosschleife.

**Fix:**
- Freshness am **Timestamp** festmachen statt an `length > 0`:
  ```ts
  const isFresh = trendingLastFetch > 0 && now - trendingLastFetch < CACHE_TTL_MS;
  ```
- Leere Ergebnisse **nicht** den gültigen Cache überschreiben lassen. In `setTrendingMovies`
  bei leerem Array den Timestamp trotzdem setzen (damit kein Refetch-Sturm), aber die alten
  Movies behalten wenn vorher welche da waren — oder separaten Error-Backoff (z.B. 5 min).
- Empfehlung: `setTrendingMovies(movies)` nur bei `movies.length > 0` die Filme ersetzen;
  bei `[]` nur `trendingLastFetch` auf `now` setzen (verhindert Loop, behält alte Daten).
- Behebt zugleich Finding #10 (Verlust gecachter Daten bei transientem Fehler).

### 1.2 Premium serverseitig als einzige Quelle 🔴 (Umsatz-Leck)
**Dateien:** `src/App.tsx:64-72`, `src/store/useStore.ts:307`, `src/services/firestoreSync.ts:6-23`

Problem: `if (premium) setPremium(true)` — bei Ablauf/Erstattung liefert RevenueCat `false`,
aber der persistierte `isPremium: true` wird nie zurückgesetzt. Zudem ist `isPremium` in
`localStorage` + Firestore editierbar → dauerhaft Premium ohne Kauf.

**Fix (Client-Teil, Phase 1):**
- `App.tsx`: `checkPremiumStatus().then(setPremium)` — also **auch** `false` durchreichen
  (nur auf nativen Plattformen; im Browser bleibt der lokale Store, da RC dort `false` liefert).
- `isPremium` aus `partialize` (`useStore.ts:307`) entfernen — nicht mehr persistieren.
- `isPremium` aus `hydrateFromCloud` (`useStore.ts:258`) und aus `saveUserData`-Payload
  (`App.tsx:112-121`) entfernen — RevenueCat ist die Wahrheit, nicht die Cloud.
- **Achtung Web:** Im Browser gibt es kein RevenueCat → dort muss ein sinnvoller Default
  bleiben (isPremium = false, Werbung an). Prüfen dass die Web-Demo nicht kaputtgeht.
- Rules-Feldschutz kommt in Phase 2 (2.1).

### 1.3 „Alle Daten zurücksetzen" / Konto-Löschen räumt localStorage wirklich auf 🔴
**Dateien:** `src/pages/ProfilePage.tsx:146-153` + `155-176`, `src/store/useStore.ts`

Problem: Nach `localStorage.removeItem('watchtwin-storage')` triggert `setOnboardingDone(false)`
sofort ein erneutes Persistieren des noch vollständigen In-Memory-States → Daten sind zurück.

**Fix:**
- Reihenfolge umdrehen: erst State leeren, dann `useStore.persist.clearStorage()` aufrufen
  (zustand-API), dann `window.location.href = '/'`.
- Sauberer: eine dedizierte `resetStore()`-Action im Store, die alle Slices auf Initialwerte
  setzt, danach `clearStorage()`. Dann Reload.
- Für beide Handler (`handleResetAll`, `handleDeleteAccount`) verwenden.

### 1.4 Trending refetcht bei Provider-Wechsel 🟠
**Dateien:** `src/components/TrendingRail.tsx:20-42`, `src/store/useStore.ts:99-101,294-295`

Problem: Trending ist provider-gefiltert und gecacht, aber der Cache kennt die Provider nicht.
Wechselt der Nutzer Netflix→Disney+, greift der `isFresh`-Guard und die alten Netflix-Titel
bleiben bis zu 6h stehen.

**Fix:**
- Provider-Signatur im Cache mitspeichern: `trendingProvidersKey: string` (z.B. sortierte
  Provider-IDs gejoint). In `isFresh` zusätzlich prüfen `trendingProvidersKey === currentKey`.
- Bei Mismatch neu fetchen. Kombiniert mit 1.1 sauber lösbar.

### 1.5 `loadGenres` gegen API-Fehler absichern 🟠
**Dateien:** `src/services/tmdb.ts:31-48,409`, `src/components/TrendingRail.tsx:28-34`

Problem: Bei Rate-Limit liefert TMDB `{status_code,...}` ohne `genres` → `.genres.map` wirft.
In `getTrendingThisWeek` steht `await loadGenres()` **vor** dem try → Exception propagiert →
`TrendingRail` hat kein `.catch` → unhandled rejection. Zusätzlich: wenn `movieGenres` gesetzt
wird aber die TV-Zeile wirft, bleibt der TV-Cache dauerhaft leer → Serien immer „Unbekannt".

**Fix:**
- In `loadGenres` beide Fetches in try/catch, defensive `?? []` auf `.genres`, Cache nur setzen
  wenn beide erfolgreich waren (atomar).
- `await loadGenres()` in `getTrendingThisWeek` **innerhalb** des try-Blocks.
- `.catch()` an den Promise in `TrendingRail.tsx` hängen.

### 1.6 Notification-Toggle nur bei erteilter Permission aktivieren 🟡
**Dateien:** `src/pages/ProfilePage.tsx:512-520`

Problem: Toggle wird auf „an" gesetzt auch wenn System-Permission verweigert → Checkbox lügt,
es wird nie was geplant.

**Fix:** Vor dem `setNotificationSettings({[key]: true})` `requestNotificationPermission()`
awaiten; bei Ablehnung Toggle nicht setzen und kurzen Hinweis zeigen („Bitte Benachrichtigungen
in den iOS/Android-Einstellungen erlauben").

### 1.7 Reminder-Reschedule entkoppeln von jeder Watchlist-Änderung 🟡
**Dateien:** `src/App.tsx:76-79`, `src/services/localNotifications.ts:88-142`

Problem: Effect hängt an `watchlist.length` → bei jedem Rechts-Swipe läuft eine
un-serialisierte Cancel+Schedule-Sequenz nativer Calls; auf iOS kann der Permission-Dialog
zu einem beliebigen Swipe auftauchen.

**Fix:**
- Nur auf das Überschreiten der Schwelle `>3` reagieren statt auf jede Längenänderung:
  einen abgeleiteten boolean `watchlistOverThreshold = watchlist.length > 3` als Dependency.
- Permission-Request aus `scheduleAllReminders` rausziehen — Permission wird im Onboarding /
  ProfilePage-Toggle geholt, `scheduleAllReminders` nur noch `checkPermissions` (kein Request).

---

## PHASE 2 — Sicherheit & DSGVO (Firestore-Rules, braucht Test)

> ⚠️ Firestore-Rules-Änderungen betreffen ALLE Live-Nutzer sofort nach Deploy. Vorher im
> Firebase-Emulator oder Test-Projekt verifizieren. Rules-Deploy ist unabhängig vom App-Release.

### 2.1 `isPremium` in Rules schützen 🔴
**Datei:** `firestore.rules:26-36`

Ergänzung zu 1.2: Auch wenn der Client `isPremium` nicht mehr schreibt, muss die Rule
verhindern, dass jemand per direktem SDK-Call `isPremium: true` setzt.

**Fix:** Bei `update` erzwingen `unchanged('isPremium')`. Da der Client das Feld künftig gar
nicht mehr schreibt, ist das sauber. (Ideal langfristig: RevenueCat-Webhook → Cloud Function
setzt `isPremium` serverseitig. Für v1.3 reicht `unchanged`.)

### 2.2 Private Nutzerdaten aus der offen lesbaren users-Collection ziehen 🟠
**Dateien:** `firestore.rules:26-36`, `src/services/firestoreSync.ts`, `src/services/friendsService.ts`

Problem: Jeder eingeloggte Nutzer kann die komplette `users`-Collection dumpen (Watchlists,
skippedIds, isPremium, alle Friend-Codes). DSGVO-relevant.

**Fix (größerer Umbau — sorgfältig):**
- Private Felder (`watchlist`, `skippedIds`, `isPremium`, `selectedGenres`) nach
  `users/{uid}/private/data` verschieben, dort `allow read: if isMe(uid)`.
- Öffentliche Projektion im Haupt-Doc lassen: `displayName`, `photoURL`, `friendCode`.
- `saveUserData`/`loadUserData`/`hydrateFromCloud` auf die neue Struktur anpassen.
- **Migration:** Bestandsnutzer haben alles im Haupt-Doc. Einmalige Lese-Migration beim
  nächsten Login (altes Feld lesen → in Subcollection schreiben → aus Haupt-Doc entfernen),
  oder tolerant beide Orte lesen für eine Übergangszeit.
- Friend-Suche (`findUserByFriendCode`) bleibt auf der öffentlichen Projektion — ideal
  langfristig per Cloud Function statt offener Collection-Query (verhindert Massen-Dump).

### 2.3 Konto-Löschung vervollständigen (DSGVO Art. 17) 🟠
**Dateien:** `src/services/firestoreSync.ts:60-92`, `src/services/profileService.ts`

Problem: Avatar (`avatars/{uid}.jpg`, öffentlich lesbar!) und Gast-Parties bleiben. Zudem:
Firestore-Daten werden VOR `deleteUser` gelöscht → wirft `deleteUser` `requires-recent-login`,
sind die Daten weg aber der Auth-Account bleibt (verwaist).

**Fix:**
- Avatar löschen: `deleteObject(ref(storage, 'avatars/'+uid+'.jpg'))` (Fehler ignorieren
  falls kein Avatar).
- Gast-Parties: zusätzlich `where('guestUid','==',uid)` löschen bzw. anonymisieren.
- Reihenfolge/Re-Auth: `deleteUser` zuerst versuchen (oder Re-Auth erzwingen) — erst wenn
  Auth-Löschung sicher ist, Firestore-Daten löschen. Alternativ: bei `requires-recent-login`
  sauber abbrechen ohne vorher Daten zu löschen.
- Langfristig robuster: Cloud Function `onDelete` (Auth-Trigger) räumt serverseitig auf.

### 2.4 Party-Swipes gegen Überschreiben schützen 🟡
**Datei:** `firestore.rules:85-89`

Problem: Party-Update prüft nur `unchanged(hostUid/guestUid)`, nicht die `swipes`-Struktur →
ein Teilnehmer könnte die Swipes des anderen überschreiben. Nur Spiel-Manipulation.

**Fix:** In der Update-Rule sicherstellen, dass ein Nutzer nur seinen eigenen `swipes.[uid]`-
Zweig schreiben darf (via `request.resource.data.swipes` Diff-Check auf den fremden Zweig).

### 2.5 `android:allowBackup="false"` 🟡
**Datei:** `android/app/src/main/AndroidManifest.xml:4`

`adb backup` kann App-Daten (Auth-Token, IndexedDB) auf entsperrten/gerooteten Geräten ziehen.
Für eine Login-App auf `false` setzen.

---

## PHASE 3 — Performance & Datenverbrauch

### 3.1 Trending-Cache persistieren 🟠 (1-Zeilen-Fix, ~32 Requests/Kaltstart gespart)
**Datei:** `src/store/useStore.ts:299-309`

`trendingMovies` + `trendingLastFetch` (+ `trendingProvidersKey` aus 1.4) in `partialize`
aufnehmen. Der 6h-Cache überlebt dann Kaltstarts wie beabsichtigt.

### 3.2 Provider-Ergebnisse cachen 🟠 (größter Datenverbrauch-Hebel)
**Dateien:** `src/services/tmdb.ts` (`getProviders`, `discoverMovies:358`, `getTrendingThisWeek:442`)

Problem: Pro `discoverMovies`-Aufruf bis zu 40 einzelne `/watch/providers`-Requests; eine
100-Swipe-Session ≈ 250+ Requests. Titel wiederholen sich über Sessions/Filter.

**Fix:**
- `providersCache: Record<number, string[]>` (analog zu `creditsCache`/`trailerCache`, die
  es schon gibt). Optional in `partialize` mit TTL persistieren (Provider ändern sich selten).
- Batch-Größe erhöhen oder alle Provider-Calls eines Batches parallel statt in 5er-Wellen.
- Nachlade-Schwelle in `SwipePage.tsx:95` von `<= 3` auf `<= 6` — Nachschub da bevor Deck
  leer läuft (behebt EmptyState-Flackern).

### 3.3 `skippedIds` begrenzen + Set-Lookup 🟠 (Langzeit-Degradation)
**Dateien:** `src/store/useStore.ts:160,181`, `src/services/firestoreSync.ts`, `src/App.tsx:110-133`

Problem: `skippedIds` wächst unbegrenzt, wird komplett persistiert + bei jedem Sync komplett
nach Firestore geschrieben, und `getFilteredMovies` macht O(n) `.includes` pro Film pro Render.

**Fix:**
- `skippedIds` auf Ring-Größe begrenzen (letzte ~2000). In `swipeLeft`: `.slice(-1999)`.
- In `getFilteredMovies` einmal `new Set(skippedIds)` bilden, dann O(1)-Lookup. Gleiches für
  den `watchlist.some(...)`-Check (Set der Watchlist-IDs).
- Danach ist der Firestore-Sync automatisch gesund (Payload bleibt begrenzt).

### 3.4 Route-Level Code-Splitting 🟡 (First-Paint-Chunk ~halbieren)
**Dateien:** `src/App.tsx:1-23`, `vite.config.ts`, `src/services/firebase.ts:28`, `profileService.ts`

Problem: 878-kB-Monolith. Firebase (alle 5 SDKs) eager beim Boot; alle 8 Pages statisch.

**Fix:**
- `React.lazy()` für `FriendsPage`, `SwipePartyPage`, `ProfilePage`, `WatchlistPage`,
  `FriendDetailPage`; `SwipePage` statisch lassen. `<Suspense fallback={<LoadingScreen/>}>`.
- `firebase/storage` lazy: `getStorage` erst in `profileService.ts` per dynamischem
  `import('firebase/storage')` laden statt eager in `firebase.ts`.
- `manualChunks` in `vite.config.ts` für `firebase` + `framer-motion` als Vendor-Chunks
  (bessere Cache-Nutzung über App-Updates).

### 3.5 SwipeCard flüssiger 🟡
**Dateien:** `src/components/SwipeCard.tsx:106-120`, `src/components/SwipeDeck.tsx:16`

**Fix:**
- Vollflächigen `blur-2xl`-Backdrop entschlacken (winzige `w92`-Version blurren oder
  CSS-Gradient) — spart GPU-Last pro Drag-Frame.
- Nächste 1-2 Poster preloaden (`new Image().src = ...` beim Deck-Advance).
- `SwipeCard` in `React.memo` wrappen.

---

## PHASE 4 — Politur / Robustheit

### 4.1 Store-Migration absichern 🟡
**Datei:** `src/store/useStore.ts:297-311`

Latenter Bug: `notificationSettings` wird als ganzes Objekt persistiert. Ein künftiger 4.
Sub-Key würde bei Bestandsnutzern durch flachen Merge `undefined`. **Fix:** `version` + `migrate`
in der persist-Config setzen, oder `merge` mit Deep-Merge der Defaults für verschachtelte Objekte.

### 4.2 Trending-Sortierung nach echtem Trend 🟡
**Datei:** `src/services/tmdb.ts:433-436`

Code sortiert nur nach `vote_average`, verwirft die Trend-Reihenfolge des Endpoints. **Fix:**
Trend-Rang als Primär-Sort behalten (Reihenfolge aus `results`), `vote_average` nur als
Tiebreaker — passend zum Feature-Namen „Neu & Trending".

### 4.3 Friend-Code Kollisions-Check 🟡
**Datei:** `src/services/friendsService.ts:21-27,75`

`generateFriendCode` prüft nicht auf Kollision; `findUserByFriendCode` gibt willkürlich
`docs[0]`. Bei ~887 Mio. Kombinationen erst spät relevant. **Fix:** Vor dem Speichern
Uniqueness prüfen (Query auf Code), bei Treffer neu generieren.

### 4.4 Entitlement-Label kosmetisch 🟢
**Datei:** `src/services/purchases.ts:10` — `'GUMU - Werbeagentur Pro'` ist der Entitlement-
Bezeichner (muss mit RevenueCat-Dashboard übereinstimmen). Kein Bug, nur unschön falls je
im UI sichtbar. Nicht anfassen ohne Dashboard-Sync.

### 4.5 Infrastruktur-Empfehlungen (kein Code, für später)
- Firebase App Check aktivieren (erschwert Fremdnutzung der Firebase-Config).
- TMDB-Token hinter dünnem Proxy (Cloud Function) — Token nicht mehr im Bundle.
- `npm audit` in die Release-Pipeline.
- Server-seitiges Rate-Limit für Friend-Requests (Rules/Function) statt nur client-seitig.

---

## Empfohlene Umsetzungs-Reihenfolge

1. **Phase 1 komplett** → als **v1.3** ausliefern (reiner Client, risikoarm, direkter Nutzer-Impact).
   Phase 3.1 (Trending-Cache persist) gleich mitnehmen — trivialer 1-Zeilen-Fix.
2. **Phase 2** parallel vorbereiten, Rules im **Firebase-Emulator** testen, dann Rules deployen
   (unabhängig vom App-Release) + Client-Anpassungen in v1.3 oder v1.4.
3. **Phase 3.2–3.5** (Performance) → v1.4.
4. **Phase 4** nach Bedarf einstreuen.

Jede Phase: `npm run build` grün, auf iOS-Simulator + echtem Android testen, `versionCode`/
`CURRENT_PROJECT_VERSION` hochzählen, `appendUserAgent` in `capacitor.config.ts` aktualisieren
(siehe CLAUDE.md), RELEASE-NOTES pflegen.
