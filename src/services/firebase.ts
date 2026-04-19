import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';

// Firebase-Konfiguration
// WICHTIG: Erstelle ein Firebase-Projekt unter https://console.firebase.google.com
// und ersetze die Werte unten mit deiner eigenen Config.
const firebaseConfig = {
  apiKey: 'AIzaSyBdXGUD5QY3kK-PFLhaMJH62m6V5cVBuUM',
  authDomain: 'watchtwin-7a2a3.firebaseapp.com',
  projectId: 'watchtwin-7a2a3',
  storageBucket: 'watchtwin-7a2a3.firebasestorage.app',
  messagingSenderId: '756461568370',
  appId: '1:756461568370:web:6b91c3af3dd65ea25f5deb',
  measurementId: 'G-D6HT5LJT08',
};

const app = initializeApp(firebaseConfig);

// Auf nativem iOS/Android indexedDB-Persistenz nutzen (stabiler in WKWebView)
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics — nur wenn unterstützt (nicht in allen Browsern / WKWebView)
export let analytics: Analytics | null = null;
isSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {
    // Analytics nicht verfügbar — ignorieren
  });

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
