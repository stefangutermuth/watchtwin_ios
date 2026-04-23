import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';

type AuthMode = 'login' | 'register';

const firebaseErrorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Diese E-Mail ist bereits registriert.',
  'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
  'auth/weak-password': 'Passwort muss mindestens 6 Zeichen haben.',
  'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
  'auth/wrong-password': 'Falsches Passwort.',
  'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte warte kurz.',
  'auth/popup-closed-by-user': 'Anmeldung abgebrochen.',
  'auth/network-request-failed': 'Netzwerkfehler. Prüfe deine Verbindung.',
  'auth/missing-or-invalid-nonce':
    'Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
  'auth/operation-not-allowed':
    'Diese Anmeldemethode ist aktuell nicht verfügbar.',
  'auth/account-exists-with-different-credential':
    'Dieses Konto existiert bereits mit einer anderen Anmeldemethode.',
};

/** Wurde der Social-Login vom User abgebrochen? (iOS Apple = 1001, Capacitor = "12501" etc.) */
export function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  const code = err.code;
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  if (typeof code === 'number' && code === 1001) return true;
  if (typeof code === 'string') {
    if (code === '1001') return true;
    if (code === '12501') return true; // Android Google cancel
    if (code === 'ERR_CANCELED') return true;
    if (code === 'auth/popup-closed-by-user') return true;
    if (code === 'auth/cancelled-popup-request') return true;
    if (code === 'auth/user-cancelled') return true;
  }
  return (
    message.includes('canceled') ||
    message.includes('cancelled') ||
    message.includes('abgebrochen')
  );
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.code && typeof err.code === 'string') {
      if (firebaseErrorMessages[err.code]) return firebaseErrorMessages[err.code];
      // Unbekannter Code: generische, benutzerfreundliche Fehlermeldung.
      // Interner Code landet im console.error-Log (siehe handleApple/Google).
      return 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
    }
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
}

export function AuthPage() {
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, resetPassword } =
    useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already logged in (navigated here from LoginPrompt), redirect
  if (user) {
    navigate('/swipe', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      // After successful login, navigate to swipe
      navigate('/swipe', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await resetPassword(email);
      setSuccessMsg('Passwort-Reset-E-Mail wurde gesendet. Prüfe dein Postfach.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
      navigate('/swipe', { replace: true });
    } catch (err: any) {
      console.error('[Auth] Google Login Fehler:', err?.code, err?.message);
      if (isUserCancelled(err)) return; // Abbruch durch User → stiller Abbruch
      setError(getErrorMessage(err));
    }
  }

  async function handleApple() {
    setError('');
    try {
      await signInWithApple();
      navigate('/swipe', { replace: true });
    } catch (err: any) {
      console.error('[Auth] Apple Login Fehler:', err?.code, err?.message, err);
      if (isUserCancelled(err)) return; // Abbruch durch User → stiller Abbruch
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-wt-dark px-6 pb-12 pt-[calc(3rem+env(safe-area-inset-top))]">
      {/* Logo */}
      <div className="flex flex-col items-center">
        <img src="/logo.png" alt="WatchTwin" className="h-14" />
        <p className="mt-3 text-gray-400">Swipe. Watch. Repeat.</p>
      </div>

      {/* Tabs */}
      <div className="mx-auto mt-10 flex w-full max-w-sm gap-1 rounded-lg bg-wt-surface p-1">
        <button
          onClick={() => { setMode('login'); setError(''); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === 'login'
              ? 'bg-wt-pink text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Anmelden
        </button>
        <button
          onClick={() => { setMode('register'); setError(''); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === 'register'
              ? 'bg-wt-pink text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Registrieren
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-4"
      >
        {/* Email */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faEnvelope}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="email"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-wt-surface py-3.5 pl-12 pr-4 text-white placeholder-gray-500 outline-none ring-1 ring-wt-surface transition-all focus:ring-wt-pink"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faLock}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl bg-wt-surface py-3.5 pl-12 pr-12 text-white placeholder-gray-500 outline-none ring-1 ring-wt-surface transition-all focus:ring-wt-pink"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        </div>

        {/* Passwort vergessen */}
        {mode === 'login' && (
          <button
            type="button"
            onClick={handleResetPassword}
            className="-mt-2 self-end text-xs text-gray-400 hover:text-wt-pink"
          >
            Passwort vergessen?
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="rounded-lg bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
            {successMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-wt-pink py-3.5 text-lg font-bold text-white transition-all hover:bg-wt-pink-light disabled:opacity-50"
        >
          {isSubmitting
            ? 'Laden...'
            : mode === 'login'
              ? 'Anmelden'
              : 'Konto erstellen'}
        </button>
      </form>

      {/* Divider */}
      <div className="mx-auto mt-6 flex w-full max-w-sm items-center gap-4">
        <div className="h-px flex-1 bg-gray-700" />
        <span className="text-xs text-gray-500">oder</span>
        <div className="h-px flex-1 bg-gray-700" />
      </div>

      {/* Social Login */}
      <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center gap-3 rounded-xl bg-wt-surface py-3.5 text-sm font-medium text-white ring-1 ring-wt-surface transition-all hover:bg-wt-surface"
        >
          <FontAwesomeIcon icon={faGoogle} className="text-lg" />
          Mit Google anmelden
        </button>
        <button
          onClick={handleApple}
          className="flex items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-medium text-black transition-all hover:bg-gray-100"
        >
          <FontAwesomeIcon icon={faApple} className="text-lg" />
          Mit Apple anmelden
        </button>
      </div>
    </div>
  );
}
