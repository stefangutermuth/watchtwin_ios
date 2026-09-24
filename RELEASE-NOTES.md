# WatchTwin — App Store Release Notes

## v1.4.3 (Android versionCode 10) — 2026-09-24

Status: AAB gebaut, Upload in die Play Console (Produktion) steht aus.

**Wartungs-Release Android:** R8-Codeoptimierung und Resource-Shrinking aktiviert (Details im
Abschnitt unten). Behebt den Play-Console-Hinweis „DEX-Codeoptimierung unter Grenzwert —
Verschleierung 2 %" aus 1.4.2. Für Nutzer keine sichtbaren Änderungen. Version damit wieder
gleichauf mit iOS 1.4.3.

Store-Text („Was ist neu"): *Stabilitäts- und Leistungsverbesserungen.*

---

## R8-Codeoptimierung (vorbereitet 2026-09-21, ausgeliefert mit 1.4.3 / versionCode 10)

Play Console meldet für 1.4.2 (versionCode 9) unter „Unerwünschtes Verhalten / Arbeitsspeichernutzung":
„Die DEX-Codeoptimierung liegt unter unserem Grenzwert — Verschleierung (2 %)", zu beheben bis **Februar 2027**.

Konfiguration aus Branch `feat/android-r8-minify` (PR #10), ausgeliefert mit versionCode 10:

- `android/app/build.gradle` (release): `minifyEnabled true`, `shrinkResources true`,
  `proguard-android-optimize.txt` + `proguard-rules.pro`.
- `android/app/proguard-rules.pro`: Crashlytics-Attribute (`SourceFile,LineNumberTable`),
  Capacitor-Vorlage (Plugin-Subklassen, `@CapacitorPlugin`/`@PluginMethod`, `@JavascriptInterface`),
  `-dontwarn com.facebook.**` (Firebase-Auth-Plugin referenziert das Facebook-SDK nur `compileOnly`,
  ohne die Regel bricht R8 mit „Missing class com.facebook.*" ab).
- Consumer-Rules der Bibliotheken kommen automatisch mit — geprüft in
  `android/app/build/outputs/mapping/release/configuration.txt`: `@capacitor/android`,
  `play-services-ads` 25.4.0, `firebase-auth` 24.0.1, RevenueCat `purchases` 10.21.1 +
  `purchases-hybrid-common` 19.0.0, `billing` 8.3.0, kotlinx-serialization/-coroutines.
  Die Capacitor-Plugins selbst (AdMob, Firebase-Auth/-Crashlytics, RevenueCat) liefern **keine**
  eigenen Consumer-Rules; sie sind über die Capacitor-Regel `-keep class * extends com.getcapacitor.Plugin` abgedeckt.
- `scripts/patch-admob-proguard.cjs` bleibt unverändert nötig (AGP-9-Fix im Plugin-Gradle).

Verifiziert am 21.09. mit dem Release-APK (`assembleRelease`, identischer R8-Output wie das AAB)
auf Pixel_7 / Android 16 (API 36): Onboarding → Swipe-Deck inkl. Trending-Leiste (TMDB),
Login-Seite + nativer Google-Sign-In-Flow (GMS-Kontoauswahl öffnet), AdMob-Interstitial nach
15 Swipes (Testanzeige, `AdActivity`), Profil/Premium-Bereich (RevenueCat konfiguriert, Offerings
abgefragt), Notification-Permission-Dialog. Logcat: keine `ClassNotFound`/`NoSuchMethod`/
`NoClassDefFound`, kein Crash. AAB 11,9 MB, APK 7,8 MB.
**Nicht getestet:** Login mit Zugangsdaten, Apple-Login, Kauf/„Käufe wiederherstellen"
(Emulator ohne Play-Billing) → beim Release mit Testkonto auf echtem Gerät prüfen.

Hinweise für das Release:
- Das Crashlytics-Gradle-Plugin lädt `mapping.txt` jetzt automatisch beim `bundleRelease` hoch
  (`uploadCrashlyticsMappingFileRelease`) — Build braucht Netz + `google-services.json`.
  Ins AAB wird die Mapping-Datei ebenfalls eingebettet (Play deobfuskiert ANRs/Crashes selbst).
- Nach dem Upload von versionCode 10: Play-Console-Hinweis „Arbeitsspeichernutzung" und
  Crashlytics-Stacktraces (lesbar?) kontrollieren.
- Kommt ein neues natives Plugin dazu: Release-Build durchklicken; bei R8-Abbruch die
  Vorschläge aus `android/app/build/outputs/mapping/release/missing_rules.txt` übernehmen.

---

## v1.4.3 (iOS only, Build 34) — 2026-09-18

Status: 18.09. eingereicht (Build 34, automatische Freigabe), beschleunigte Prüfung beantragt.

**Hotfix: iOS 1.4.2 stürzt auf iOS 27 direkt beim Start ab.**

Ursache (im iOS-27-Simulator reproduziert, Crash-Report `App-2026-09-18-213210.ips`):
`UIKitCore ___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` → SIGTRAP.
Apps, die mit dem iOS-27-SDK (Xcode 27) gebaut sind, müssen den UIScene-Lebenszyklus nutzen;
das Capacitor-Template hatte nur den klassischen AppDelegate. 1.4.2 war der erste Xcode-27-Build
(wegen des RevenueCat-Zwangsupdates), daher trat es genau jetzt auf. Crashlytics meldete nichts,
weil der Abbruch vor jeder App-Initialisierung passiert; iOS-26-Geräte/-Simulatoren sind nicht betroffen.

Fix nach https://capacitorjs.com/docs/updating/8-5: `UIApplicationSceneManifest` in `Info.plist`,
`configurationForConnecting` + `SceneDelegate` (mit `SceneDelegateProxy`) in `AppDelegate.swift`.
Verifiziert: Release-Build startet auf iOS-27- und iOS-26.5-Simulator, Custom-URL-Scheme
(`watchtwin://`) kommt über die Scene an. Android unverändert (1.4.2 / versionCode 9).

Store-Text („Was ist neu"): *Behebt einen Absturz beim Start unter iOS 27.*

## v1.4.2 (Android versionCode 9, iOS Build 33) — 2026-09-17

Status: iOS Build 33 live seit 18.09. (Start-Crash auf iOS 27 → 1.4.3); Android 1.4.2 (9) live seit 17.09. 21:49 (Play-Review sofort, Rollout 100 %).

**Hotfix: leeres Deck für Nutzer mit Joyn, Magenta TV oder RTL+** (auch 1.4.1 betroffen).

Ursache war keine API-Einschränkung, sondern umgezogene Anbieter-Daten bei TMDB/JustWatch:

| Anbieter | alt (App) | heute bei TMDB | Wirkung |
|---|---|---|---|
| RTL+ | 298 | **2750** (298 nicht mehr in DE-Liste) | Katalog 4 Titel statt 683 |
| Magenta TV | 178 | 178 = Kauf-/Leih-Store; Abo = **Magenta TV+ 2412** | 7.000 Kauf-Titel im Deck, 0 % nutzbar |
| Joyn | 304 | Titel unter **`ads`/`free`** statt `flatrate` | 0 % nutzbar |

Fix: `Provider.tmdbAliases` (1796 Netflix mit Werbung, 2100 Prime mit Werbung, 421 Joyn Plus,
298 RTL+ alt), Discover/TotalPages mit `flatrate|free|ads`, `getProviders` wertet alle drei
Monetarisierungsarten aus. Live-Simulation (3 Zufalls-Batches je Fall, nutzbare Titel):
nur Joyn 0 % → 100 %, nur Magenta 0 % → 100 %, nur RTL+ 4 → 683 Titel, Mix
Netflix/Disney+/WOW/Joyn/Magenta 76 % → 100 %, nur Netflix unverändert 100 %.

**Zusätzlich (Build-Zwang): `@revenuecat/purchases-capacitor` 12.3.2 → 13.6.0.** Seit dem Umstieg
auf Xcode 27 / macOS 27 kompiliert das an 12.3.2 gepinnte `purchases-ios` 5.67.1 nicht mehr
(„ambiguous use of init(stringRepresentation:)" in `PaywallColor`/`CustomerCenterConfigData`);
12.3.2 ist die letzte 12er-Version, ein Xcode 26 ist nicht mehr installiert. 13.0.0-Breaking-Changes:
Android minSdk 23 (wir: 24), Billing Library 8.3, kein Restore mehr für *konsumierte* Einmalkäufe —
`watchtwin_premium_lifetime` ist Non-consumable, daher nicht betroffen. Keine API-Umbenennungen;
`purchases.ts` unverändert. ⚠️ Kauf + „Käufe wiederherstellen" vor Freigabe per TestFlight prüfen.

Diagnose-Vorgehen für künftige ID-Drift: pro Anbieter `discover` (total_results) abfragen und
für ~10 Stichproben `/{movie|tv}/{id}/watch/providers` prüfen, unter welchem Schlüssel
(`flatrate`/`free`/`ads`/`rent`/`buy`) die Anbieter-ID auftaucht; zusätzlich
`/watch/providers/movie?watch_region=DE` auf den aktuellen Namen/ID prüfen.

Store-Text („Was ist neu"): *Behebt ein Problem, durch das bei Joyn, Magenta TV und RTL+ keine
Titel mehr angezeigt wurden. RTL+ und Joyn zeigen jetzt wieder den vollen Katalog.*

---

## v1.4.1 (Android versionCode 8, iOS Build 32) — 2026-09-05

**Bugfix-Release** direkt nach 1.4. Apple hatte 1.4 (Build 31) bereits über Nacht genehmigt und
veröffentlicht (live seit 05.09., 00:02 Uhr) — der Versionszug 1.4 ist damit geschlossen → 1.4.1.
Android 1.4 (versionCode 7) ging am 04.09. ebenfalls live (Play-Review über Nacht).

- 🐛 **„Alles durchgeswipet" obwohl nichts geswiped (iOS gemeldet)**: TMDB drosselt beim
  App-Start (Trending + Deck ≈ 80 Requests → HTTP 429). `getProviders` (seit 1.3) gab bei
  Fehlern `[]` zurück *und cachte das*, `discoverMovies` warf Titel ohne Anbieter weg, und
  der Nachlade-Effekt griff nur bei `filtered.length > 0` → Deck dauerhaft leer bis Neustart.
  Fix: `tmdbFetch`-Wrapper (max. 6 parallel, 429/5xx-Retry mit Backoff + Retry-After),
  `getProviders` liefert bei Fehler `null` (nie gecacht), Discover fällt auf die gewählten
  Anbieter zurück statt zu verwerfen, SwipePage lädt bei leerem Deck bis zu 3× automatisch
  nach, EmptyState hat „Neue Vorschläge laden". Unter künstlicher 50 %-Drosselung verifiziert.
- ✨ **Trending-Titel direkt bewerten**: Aus dem Detail-Modal der „Neu & Trending"-Leiste
  geht jetzt Watchlist / Favorit / Gesehen (gleiche Login- und Ad-Logik wie im Deck);
  Titel auf der Watchlist bekommen ein grünes Häkchen in der Leiste.

Store-Text („Was ist neu"): *Behebt einen Fehler, bei dem keine neuen Titel mehr geladen wurden.
Trending-Titel lassen sich jetzt direkt auf die Watchlist setzen.* (Android zusätzlich die
1.4-Punkte unten, da dort 1.4 nie veröffentlicht wurde.)

---

## v1.4 (Android versionCode 7, iOS Build 31 — beide live seit 2026-09-04/05) — 2026-09-04

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

- [ ] Android: `versionCode` erhöht, `appendUserAgent` in `capacitor.config.ts` aktualisiert
- [ ] Android: Release-Build läuft mit R8 (`minifyEnabled true`) — `./gradlew bundleRelease` ohne
      R8-Fehler; Release-APK im Emulator durchklicken (Start, Deck, Login, Ad, Premium) und Logcat
      auf `ClassNotFound`/`NoSuchMethod` prüfen; neue native Plugins ggf. in `proguard-rules.pro` ergänzen
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
