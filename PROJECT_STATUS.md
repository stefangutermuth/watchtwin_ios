# PROJECT_STATUS.md — WatchTwin Play-Store-Release

**Stand:** 2026-04-25 nach Submit
**Aktueller Status:** 🟡 **In Google-Review** (eingereicht für Production / DACH)

---

## ✅ Erledigt (alles eingereicht)

### App-Bundle
- [x] AAB **versionCode=3, versionName=1.1** in der Library und im Production-Release
- [x] Lokale `build.gradle` steht auf `versionCode 3, versionName "1.1"` (verbrannte Codes: 1, 2)
- [x] Java/JDK für Build kommt aus Android Studio JBR (`/Applications/Android Studio.app/Contents/jbr/Contents/Home`)

### Store-Eintrag (Deutsch / de-DE)
- [x] App-Name: `WatchTwin`
- [x] Kurzbeschreibung (74/80 Zeichen)
- [x] Vollständige Beschreibung (~1345/4000 Zeichen)
- [x] App-Icon 512×512: `review-assets/play-icon-512.png`
- [x] Vorstellungsgrafik 1024×500: `review-assets/feature-graphic-1024x500.png`
- [x] Telefon-Screenshots (5 Stück) aus `review-assets/android-screenshots/`

### App-Inhalte (alle Deklarationen erledigt)
- [x] IARC-Altersfreigaben
- [x] Zielgruppe (18+)
- [x] Datensicherheit (5-Schritt-Wizard, keine Datenweitergabe an Dritte)
- [x] Werbe-ID = Ja, Zweck Analyse
- [x] Behörden-Apps = Nein
- [x] Finanzfunktionen = keine
- [x] Gesundheits-Apps = keine
- [x] Datenschutzerklärung-URL: `https://watchtwin.de/datenschutzerklaerung/`
- [x] App-Zugriff (eingeschränkte Funktionen dokumentiert)

### Play-Store-Einstellungen
- [x] App-Kategorie: **Unterhaltung**
- [x] Kontakt-E-Mail: `info@gumu-agentur.de`
- [x] Kontakt-Website: `https://watchtwin.de`
- [x] Telefonnummer: leer (optional)

### Veröffentlichung
- [x] Länder/Regionen: **DACH** (DE, AT, CH)
- [x] Verwaltete Veröffentlichung **AUS** → wird nach Approval automatisch live
- [x] Release-Notes (de-DE) im Bundle
- [x] **Eingereicht zur Google-Prüfung** ✅

## 🟡 Laufend

- 🟡 **Google-Review** (typisch 2–7 Tage)
  - Benachrichtigung kommt an die Konto-E-Mail (`stefan@gumu-agentur.de`)
  - Status hier verfolgen: `play.google.com/console/u/2/developers/8575656881859568595/app/4976108732985279672/publishing`

## ⏳ Was nach Approval zu tun ist

1. App geht **automatisch live** in DACH.
2. Verifizieren in Play Store (`https://play.google.com/store/apps/details?id=de.watchtwin.app`).
3. Demo-Account auf der App testen (E-Mail `demo@watchtwin.de`).
4. Ggf. weitere Länder hinzufügen (Veröffentlichungen → Production → Länder/Regionen).
5. Übersetzungen (EN, FR, ES …) nachschieben für mehr Reichweite.

## 🛠 Was bei Ablehnung zu tun ist

1. Google-E-Mail / Console-Notification lesen — meist konkrete Punkte (z.B. fehlende Screenshots, Datenschutz-Inkonsistenz, AdMob-Compliance).
2. Punkt fixen.
3. `versionCode` in `android/app/build.gradle` auf **4** erhöhen.
4. Neu bauen: `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`.
5. Neues AAB hochladen, Release-Notes ergänzen, erneut einreichen.

## Bekannte Stolperfallen (für nächstes Release)

- `versionCode` muss bei jedem Upload monoton steigen. Aktuell verbrannt: 1, 2, 3 (3 ist eingereicht).
- AAB-Upload via Browser-Extension (`file_upload`) ist auf `play.google.com` blockiert — manueller Drag&Drop oder Hochladen-Button nötig.
- Build braucht `JAVA_HOME=/Applications/Android Studio.app/Contents/jbr/Contents/Home` (Standard-System-Java fehlt).
- Capacitor-Sync vor jedem Gradle-Build: `npm run build && npx cap sync android`.
