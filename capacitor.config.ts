import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.watchtwin.app',
  appName: 'WatchTwin',
  webDir: 'dist',
  server: {
    // Nur für Entwicklung — in Produktion entfernen
    // androidScheme: 'https',
  },
  ios: {
    // 'never' = WebView füllt komplette Screen-Höhe (inkl. unter Safe-Areas).
    // Safe-Areas werden via CSS env(safe-area-inset-*) + viewport-fit=cover gehandlet.
    // 'automatic' würde zusätzlich die ScrollView-Insets setzen → doppelte Safe-Area-Padding.
    contentInset: 'never',
  },
  plugins: {
    AdMob: {
      appIdIos: 'ca-app-pub-5931519454513162~5638409484',
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com'],
    },
    Keyboard: {
      // resize: 'none' — Keyboard verändert das Layout nicht.
      // Ursprünglich 'native'/'body' versucht, beide haben Layout-Probleme ausgelöst.
      // Inputs werden über scrollIntoView gehandelt (kommt automatisch von iOS).
      resize: 'none',
      style: 'dark',
    },
  },
};

export default config;
