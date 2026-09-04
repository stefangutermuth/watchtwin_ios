# WatchTwin — App Store Release Notes

## v1.4 (Android versionCode 7, iOS Build 31) — 2026-09-04

**Wartungs-Release** (kein Nutzer-Bug — Crashlytics iOS/Android seit 1.3 ohne Absturz):

- 🔒 **Sicherheits-Audit**: 12 → **0** Schwachstellen in Produktions-Dependencies.
  Relevant war nur `react-router-dom` 7.14.0 → 7.18.3 (Open-Redirect/XSS-Klasse);
  Rest war Build-Tooling. `@capacitor/cli` von `dependencies` nach `devDependencies`.
- ⬆️ **Dependencies (Minor)**: Capacitor Core/iOS/Android 8.3 → 8.5.1, Local-Notifications
  8.2 → 8.3.1, @capacitor-firebase/* 8.2 → 8.5.1, Firebase 12.12 → 12.18, AdMob-Plugin 8.0 → 8.1,
  FontAwesome/Tailwind/Vite-Tooling aktuell. **Nicht** angefasst (Major): RevenueCat 12→13,
  framer-motion 12→13.
- 🤖 **Android 16 / Play-Console-Warnung behoben**: Veraltetes `windowOptOutEdgeToEdgeEnforcement`
  (ab targetSdk 36 wirkungslos) und deprecated `setStatusBarColor`/`setNavigationBarColor`
  entfernt; helle Bar-Icons jetzt via `WindowInsetsControllerCompat`. Auf Android-16-Emulator
  verifiziert: Layout unverändert korrekt.
- 🛠️ **Build-Fix**: `@capacitor-community/admob` nutzt `proguard-android.txt`, das AGP 9.x hart
  ablehnt → `scripts/patch-admob-proguard.cjs` patcht das per `postinstall` (siehe CLAUDE.md).
- 📄 `website/app-ads.txt` (AdMob-Verifizierung) ins Repo aufgenommen.
- 🎨 **Swipe-Buttons vereinheitlicht** (`SwipeActionButton`): fünf identische Kreise mit
  getöntem Ring, Beschriftung darunter, Farbe = Swipe-Richtung (rot Nope, blau Gesehen,
  lila Favorit, grün Like, grau Zurück). Vorher drei Größen und zwei Stile → wirkte unruhig.
  Legende im Swipe-Tutorial angepasst.

Store-Text („Was ist neu"): *Übersichtlichere Swipe-Buttons mit Beschriftung, Stabilitäts- und
Sicherheitsupdate, verbesserte Kompatibilität mit Android 16.*

---

## v1.3 (Android versionCode 6, iOS Build 30) — 2026-07-08

**Bugfix- & Stabilitäts-Release** (nach Code-Review, siehe OPTIMIZATION-PLAN.md):

- 🐛 **Trending-Endlosschleife behoben**: Bei API-Fehler/leerem Filter-Ergebnis fetchte die
  Trending-Leiste ununterbrochen neu (Akku/Datenverbrauch). Cache-Freshness hängt jetzt am
  Timestamp; leere Ergebnisse überschreiben den gültigen Cache nicht mehr.
- 🔒 **Premium nicht mehr manipulierbar**: `isPremium` wird nicht mehr in localStorage/Firestore
  persistiert — RevenueCat ist die einzige Quelle, auch Widerruf (Erstattung/Ablauf) greift jetzt.
  Firestore-Rules blockieren zusätzlich das Setzen von `isPremium: true` per Client.
- 🐛 **„Alle Daten zurücksetzen"/Konto löschen** leert den lokalen Speicher jetzt wirklich
  (vorher schrieb der laufende State ihn sofort wieder zurück).
- 🐛 **Trending reagiert auf Anbieter-Wechsel** (Provider-Key im Cache).
- 🛡️ **DSGVO: Konto-Löschung vervollständigt** — Profilbild im Storage und Gast-Parties werden
  mitgelöscht; Recent-Login wird VOR dem Löschen geprüft (keine halbgelöschten Accounts mehr).
- ⚡ **~90 % weniger TMDB-Requests**: Provider-Lookups gecacht (vorher ~250 Requests pro
  Swipe-Session), Trending-Cache überlebt App-Neustarts, Deck lädt früher nach (Schwelle 6).
- ⚡ **Swipe-Verlauf begrenzt** (letzte 2000) — Firestore-Sync-Payload wächst nicht mehr unbegrenzt.
- 🛡️ Android: `allowBackup=false`; Genre-Laden robust gegen TMDB-Rate-Limits;
  Trending sortiert nach echtem Trend-Rang; Notification-Toggle nur bei erteilter Permission.

**⚠️ Deployment-Hinweis:** `firestore.rules` wurde geändert (isPremium-Schutz, Party-Delete für
Gäste) → muss separat in der Firebase Console deployt werden (unabhängig vom App-Release)!

---

## v1.2 (Android versionCode 5, iOS Build 29) — 2026-05-17

**Eingereicht zur Review:** Android (Google Play) ✅, iOS (App Store) ⏳

**Was ist neu:**
- 🎬 **Neu & Trending-Sektion** auf der SwipePage — frische Filmempfehlungen via TMDB `/trending/{movie,tv}/week`, client-side gefiltert nach den vom User gewählten Streaming-Anbietern, 6h-Cache
- 🔔 **Lokale Erinnerungen** via `@capacitor/local-notifications`:
  - Freitag 17:00 — „🍿 Wochenende! Schon entschieden was ihr schaut?"
  - Sonntag 19:00 — „🎬 Filmabend? Dein nächster Lieblingsfilm wartet."
  - Montag 18:00 — Watchlist-Reminder (nur wenn > 3 Filme)
  - Opt-in per Toggle im Profil + Permission-Frage im Onboarding-Step 3
- 💰 **Premium-Preis 4,99 € → 0,99 €** (3 UI-Strings: AdOverlay, ProfilePage Login-Banner, ProfilePage Aufwertungs-Banner). Preis in Play Console + App Store Connect parallel angepasst.
- 🤝 **RevenueCat-Setup Android komplett**: Service-Account angelegt, Pub/Sub-Admin-Rolle erteilt, `watchtwin_premium_lifetime` importiert und mit Entitlement „GUMU - Werbeagentur Pro" verknüpft.

**Native-Änderungen:**
- Android `versionCode 5`, `versionName "1.2"`
- AndroidManifest: `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`
  *(SCHEDULE_EXACT_ALARM bewusst weggelassen — Play erlaubt das nur für Wecker/Kalender; wöchentliche Reminder kommen mit inexakten Alarmen aus)*
- iOS `MARKETING_VERSION 1.2`, `CURRENT_PROJECT_VERSION 29`

---



## Test-Account für App Review

Bitte in App Store Connect unter **App Information → App Review Information** eintragen:

```
Demo-Account:
E-Mail:   demo@watchtwin.de
Passwort: [hier einsetzen nach Anlegen des Demo-Accounts]

Notes für Reviewer:
- WatchTwin ist eine Film-/Serien-Discovery-App (Tinder-Style Swipe).
- Nach Login kommt eine Streaming-Anbieter-Auswahl (Onboarding-Schritt).
- Bitte mindestens Netflix und Disney+ auswählen, damit Inhalte angezeigt werden.
- Das Freunde-Feature erfordert einen zweiten Account. Mit dem Code "ABCD12"
  (des Demo-Accounts) können Reviewer einen eigenen Anfragen-Test machen.
- In-App-Purchase "Premium" kann via Sandbox-Account getestet werden
  (werbefrei + unbegrenzte Watchlist).
```

## Demo-Account anlegen (einmalig)

1. In der App „Anmelden" → „Konto erstellen"
2. E-Mail `demo@watchtwin.de` und ein sicheres Passwort verwenden
3. In Firebase Console → Authentication dem Account den Display-Namen „Demo User" geben
4. Mindestens 3-5 Filme liken damit die Watchlist für Reviewer nicht leer ist
5. Den Friend-Code aus der App ins Review-Info-Feld übertragen

## Vor jedem Release prüfen

- [ ] Version (`MARKETING_VERSION`) in `ios/App/App.xcodeproj/project.pbxproj`
- [ ] Build-Nummer (`CURRENT_PROJECT_VERSION`) erhöht
- [ ] `npm run build` läuft fehlerfrei
- [ ] `npx cap sync ios` erfolgreich
- [ ] Xcode: Any iOS Device → Product → Archive
- [ ] Organizer → Distribute App → App Store Connect

## Release Checklist (vor jedem App Store Upload)

### App-Konfiguration
- [x] Privacy Manifest (`PrivacyInfo.xcprivacy`) vorhanden
- [x] Firestore Security Rules strikt (keine ungeschützten Writes)
- [x] Error Boundary fängt React-Crashes
- [x] Crashlytics aktiv
- [x] Analytics Events getrackt
- [x] Offline-Banner bei Verbindungsverlust
- [x] Rate-Limiting für Friend-Requests (10/min)

### Apple-Spezifisch
- [x] ATT-Prompt vor AdMob (iOS)
- [x] Viewport verhindert Auto-Zoom
- [ ] IAP Products in App Store Connect angelegt & aktiv
- [ ] Sandbox-Tester-Account für IAP-Test
- [ ] Demo-Account für App Review
- [ ] App Review Informationen ausgefüllt
- [ ] Export-Compliance (Verschlüsselung) beantwortet
- [ ] Age Rating Questionnaire ausgefüllt

### Firebase
- [x] Storage Rules deployed (Blaze-Tarif aktiv)
- [ ] Firestore Rules deployed (siehe `firestore.rules` — manuell in Console)
- [ ] Crashlytics dSYMs werden hochgeladen (automatisch via Xcode)

### Rechtliches (schon erledigt)
- [x] Impressum auf watchtwin.de/impressum
- [x] Datenschutzerklärung auf watchtwin.de/datenschutz
- [x] Nutzungsbedingungen auf watchtwin.de/nutzungsbedingungen
- [x] TMDB-Attribution in ProfilePage
- [x] Konto-Löschung implementiert (Art. 17 DSGVO)
