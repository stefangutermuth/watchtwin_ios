# WatchTwin — App Store Release Notes

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
