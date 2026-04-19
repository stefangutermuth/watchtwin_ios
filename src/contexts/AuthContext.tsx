import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../services/firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { trackLogin, trackSignup, identifyUser } from '../services/analytics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      identifyUser(firebaseUser?.uid ?? null);
      setLoading(false);
    });

    // Safety timeout: if onAuthStateChanged never fires (native edge case),
    // stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('[Auth] Timeout — setze loading auf false');
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    trackLogin('email');
  }

  async function signUpWithEmail(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
    trackSignup('email');
  }

  async function signInWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Firebase Auth plugin
      console.log('[Auth] Starting native Google Sign-In...');
      const result = await FirebaseAuthentication.signInWithGoogle();
      console.log('[Auth] Google result:', JSON.stringify(result));
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error('Google Sign-In: Kein Token erhalten. Bitte erneut versuchen.');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } else {
      // Web: use popup
      await signInWithPopup(auth, googleProvider);
    }
    trackLogin('google');
  }

  async function signInWithApple() {
    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Firebase Auth plugin
      console.log('[Auth] Starting native Apple Sign-In...');
      const result = await FirebaseAuthentication.signInWithApple();
      console.log('[Auth] Apple result:', JSON.stringify(result));
      const idToken = result.credential?.idToken;
      const nonce = result.credential?.nonce;
      if (!idToken) throw new Error('Apple Sign-In: Kein Token erhalten. Bitte erneut versuchen.');
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken, rawNonce: nonce });
      await signInWithCredential(auth, credential);
    } else {
      // Web: use popup
      await signInWithPopup(auth, appleProvider);
    }
    trackLogin('apple');
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function logout() {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
