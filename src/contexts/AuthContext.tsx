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
      // Native: use Capacitor Firebase Auth plugin with skipNativeAuth so the
      // Firebase JS SDK performs the actual sign-in (onAuthStateChanged fires).
      console.log('[Auth] Starting native Google Sign-In...');
      const result = await FirebaseAuthentication.signInWithGoogle({
        skipNativeAuth: true,
      });
      console.log('[Auth] Google result. hasIdToken=', !!result.credential?.idToken);
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
      // Native: use Capacitor Firebase Auth plugin with skipNativeAuth:true.
      // Without this, the plugin internally calls Auth.auth().signIn(with:) on
      // the native Firebase SDK which consumes the Apple idToken. A second call
      // to signInWithCredential() from the JS SDK then fails with
      // auth/missing-or-invalid-nonce because the token is already used.
      // With skipNativeAuth:true the plugin just returns the raw credential
      // (idToken + raw nonce) so the JS SDK does the actual sign-in.
      console.log('[Auth] Starting native Apple Sign-In...');
      let result;
      try {
        result = await FirebaseAuthentication.signInWithApple({
          skipNativeAuth: true,
        });
      } catch (pluginErr: any) {
        console.error('[Auth] Apple plugin step failed:', pluginErr?.code, pluginErr?.message, pluginErr);
        throw pluginErr;
      }
      console.log('[Auth] Apple result received. hasCredential=', !!result.credential, 'hasIdToken=', !!result.credential?.idToken, 'hasNonce=', !!result.credential?.nonce);
      const idToken = result.credential?.idToken;
      const nonce = result.credential?.nonce;
      if (!idToken) {
        console.error('[Auth] Apple Sign-In: Missing idToken in plugin result', result);
        throw new Error('Apple Sign-In: Kein Token erhalten. Bitte erneut versuchen.');
      }
      try {
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({ idToken, rawNonce: nonce });
        await signInWithCredential(auth, credential);
      } catch (fbErr: any) {
        console.error('[Auth] Apple Firebase credential step failed:', fbErr?.code, fbErr?.message, fbErr);
        throw fbErr;
      }
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
