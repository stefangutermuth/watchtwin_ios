import { ProviderSelect } from '../components/ProviderSelect';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deleteUserData, deleteAccountCompletely } from '../services/firestoreSync';
import { purchasePremium, restorePurchases } from '../services/purchases';
import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookmark,
  faEye,
  faTv,
  faRotateLeft,
  faTrash,
  faCrown,
  faCheck,
  faRightFromBracket,
  faUser,
  faArrowRotateRight,
  faRightToBracket,
  faLanguage,
  faFilm,
  faShieldHalved,
  faFileLines,
  faCircleInfo,
  faArrowUpRightFromSquare,
  faPen,
  faCamera,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { uploadProfilePhoto, updateCustomProfile, getCustomProfile } from '../services/profileService';
import { trackPremiumPurchase, trackPremiumRestore } from '../services/analytics';
import { GENRES } from '../data/genres';

const AVAILABLE_LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'Englisch', flag: '🇬🇧' },
  { code: 'fr', label: 'Französisch', flag: '🇫🇷' },
  { code: 'es', label: 'Spanisch', flag: '🇪🇸' },
  { code: 'it', label: 'Italienisch', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanisch', flag: '🇯🇵' },
  { code: 'ko', label: 'Koreanisch', flag: '🇰🇷' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'tr', label: 'Türkisch', flag: '🇹🇷' },
  { code: 'pt', label: 'Portugiesisch', flag: '🇵🇹' },
];

export function ProfilePage() {
  const watchlist = useStore((s) => s.watchlist);
  const selectedProviders = useStore((s) => s.selectedProviders);
  const selectedLanguages = useStore((s) => s.selectedLanguages);
  const toggleLanguage = useStore((s) => s.toggleLanguage);
  const setLanguages = useStore((s) => s.setLanguages);
  const selectedGenres = useStore((s) => s.selectedGenres);
  const toggleGenre = useStore((s) => s.toggleGenre);
  const setGenres = useStore((s) => s.setGenres);
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);
  const resetDeck = useStore((s) => s.resetDeck);
  const isPremium = useStore((s) => s.isPremium);
  const setPremium = useStore((s) => s.setPremium);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [purchaseMsg, setPurchaseMsg] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [customName, setCustomName] = useState<string | undefined>();
  const [customPhoto, setCustomPhoto] = useState<string | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchedCount = watchlist.filter((w) => w.watched).length;

  // Custom-Profil laden
  useEffect(() => {
    if (!user) return;
    getCustomProfile(user.uid).then((p) => {
      setCustomName(p.customDisplayName);
      setCustomPhoto(p.customPhotoURL);
    });
  }, [user]);

  const displayName = customName || user?.displayName || 'Unbekannt';
  const displayPhoto = customPhoto || user?.photoURL || null;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(user.uid, file);
      await updateCustomProfile(user.uid, { customPhotoURL: url });
      setCustomPhoto(url);
    } catch (err) {
      alert('Bild-Upload fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveName() {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateCustomProfile(user.uid, { customDisplayName: nameInput.trim() });
      setCustomName(nameInput.trim());
      setEditingName(false);
    } catch (err) {
      alert('Name speichern fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingName(false);
    }
  }

  async function handlePurchasePremium() {
    setPurchaseMsg('');
    const result = await purchasePremium();
    if (result.success) {
      setPremium(true);
      trackPremiumPurchase();
    } else if (result.message) {
      setPurchaseMsg(result.message);
    }
  }

  async function handleRestorePurchases() {
    setPurchaseMsg('');
    const result = await restorePurchases();
    if (result.isPremium) {
      setPremium(true);
      trackPremiumRestore();
    }
    if (result.message) {
      setPurchaseMsg(result.message);
    }
  }

  async function handleLogout() {
    await logout();
  }

  async function handleResetAll() {
    if (user) {
      await deleteUserData(user.uid).catch(console.error);
    }
    localStorage.removeItem('watchtwin-storage');
    setOnboardingDone(false);
    window.location.href = '/';
  }

  async function handleDeleteAccount() {
    if (!user) return;
    const confirmed = window.confirm(
      'Konto endgültig löschen?\n\nAlle deine Daten (Profil, Watchlist, Freundschaften, Parties) werden unwiderruflich entfernt. Dein Login wird gelöscht. Diese Aktion kann NICHT rückgängig gemacht werden.'
    );
    if (!confirmed) return;
    try {
      await deleteAccountCompletely(user.uid);
      localStorage.removeItem('watchtwin-storage');
      setOnboardingDone(false);
      window.location.href = '/';
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        alert(
          'Aus Sicherheitsgründen musst du dich für die Konto-Löschung neu anmelden. Bitte logge dich aus, melde dich erneut an und versuche es nochmal.'
        );
      } else {
        alert('Konto-Löschung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold text-white">Profil</h1>
      </div>

      {/* User info / Login prompt */}
      {user ? (
        <div className="mx-4 rounded-xl bg-wt-card p-4">
          <div className="flex items-center gap-3">
            {/* Avatar mit Edit-Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-wt-pink/20"
              disabled={uploadingPhoto}
            >
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt="Avatar"
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <FontAwesomeIcon icon={faUser} className="text-xl text-wt-pink" />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-wt-pink text-white shadow-lg">
                {uploadingPhoto ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" />
                ) : (
                  <FontAwesomeIcon icon={faCamera} className="text-[9px]" />
                )}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </button>

            {/* Name + E-Mail */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="w-full rounded-lg bg-wt-surface px-3 py-1.5 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-wt-pink"
                    placeholder="Dein Name"
                    autoFocus
                    maxLength={30}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !nameInput.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wt-pink text-white disabled:opacity-50"
                  >
                    {savingName ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                    ) : (
                      <FontAwesomeIcon icon={faCheck} className="text-xs" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-white truncate">{displayName}</p>
                  <button
                    onClick={() => {
                      setNameInput(displayName);
                      setEditingName(true);
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-wt-surface hover:text-white"
                  >
                    <FontAwesomeIcon icon={faPen} className="text-[9px]" />
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg bg-wt-surface px-3 py-2 text-xs font-medium text-gray-400 hover:text-white"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-4 rounded-xl bg-wt-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-wt-surface">
              <FontAwesomeIcon icon={faUser} className="text-xl text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Gast</p>
              <p className="text-xs text-gray-400">Melde dich an, um alles zu speichern</p>
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2 rounded-lg bg-wt-pink px-3 py-2 text-xs font-bold text-white hover:bg-wt-pink-light"
            >
              <FontAwesomeIcon icon={faRightToBracket} />
              Anmelden
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-wt-card p-4 text-center">
          <FontAwesomeIcon icon={faBookmark} className="text-wt-pink mb-1" />
          <div className="text-2xl font-bold text-wt-pink">
            {watchlist.length}
          </div>
          <div className="text-xs text-gray-400">Watchlist</div>
        </div>
        <div className="rounded-xl bg-wt-card p-4 text-center">
          <FontAwesomeIcon icon={faEye} className="text-green-500 mb-1" />
          <div className="text-2xl font-bold text-green-500">
            {watchedCount}
          </div>
          <div className="text-xs text-gray-400">Gesehen</div>
        </div>
        <div className="rounded-xl bg-wt-card p-4 text-center">
          <FontAwesomeIcon icon={faTv} className="text-blue-500 mb-1" />
          <div className="text-2xl font-bold text-blue-500">
            {selectedProviders.length}
          </div>
          <div className="text-xs text-gray-400">Anbieter</div>
        </div>
      </div>

      {/* Premium section */}
      <div className="mx-4 mt-6">
        {isPremium ? (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-wt-purple/20 to-wt-pink/20 p-4">
            <FontAwesomeIcon icon={faCrown} className="text-2xl text-wt-purple-light" />
            <div>
              <h3 className="font-bold text-white">WatchTwin Premium</h3>
              <p className="text-xs text-gray-400">Aktiv — keine Werbung, alle Features</p>
            </div>
            <FontAwesomeIcon icon={faCheck} className="ml-auto text-green-400" />
          </div>
        ) : !user ? (
          <button
            onClick={() => navigate('/auth')}
            className="w-full rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink p-4 text-left shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faCrown} className="text-2xl text-white" />
              <div>
                <h3 className="font-bold text-white">Premium freischalten</h3>
                <p className="text-xs text-white/70">Anmelden und werbefrei swipen — 4,99 €</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handlePurchasePremium}
              className="w-full rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink p-4 text-left shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faCrown} className="text-2xl text-white" />
                <div>
                  <h3 className="font-bold text-white">Premium freischalten</h3>
                  <p className="text-xs text-white/70">Keine Werbung, unbegrenzte Watchlist — 4,99 €</p>
                </div>
              </div>
            </button>
            <button
              onClick={handleRestorePurchases}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-wt-surface py-2.5 text-xs font-medium text-gray-400 hover:bg-wt-surface hover:text-white"
            >
              <FontAwesomeIcon icon={faArrowRotateRight} className="text-[10px]" />
              Käufe wiederherstellen
            </button>
            {purchaseMsg && (
              <p className="text-center text-xs text-wt-purple-light">{purchaseMsg}</p>
            )}
          </div>
        )}
      </div>

      {/* Provider section */}
      <div className="mt-6 px-4">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Streaming-Dienste
        </h2>
        <ProviderSelect />
      </div>

      {/* Language filter */}
      <div className="mx-4 mt-6 rounded-2xl bg-wt-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wt-pink/15">
              <FontAwesomeIcon icon={faLanguage} className="text-wt-pink" />
            </div>
            <h2 className="text-base font-semibold text-white">Sprache</h2>
            {selectedLanguages.length > 0 && (
              <span className="rounded-full bg-wt-pink/20 px-2 py-0.5 text-[10px] font-bold text-wt-pink">
                {selectedLanguages.length}
              </span>
            )}
          </div>
          {selectedLanguages.length > 0 && (
            <button
              onClick={() => setLanguages([])}
              className="text-xs font-medium text-gray-400 hover:text-white"
            >
              Zurücksetzen
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-400">
          Nur Titel in diesen Originalsprachen anzeigen. Ohne Auswahl alle.
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const selected = selectedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                  selected
                    ? 'bg-gradient-to-r from-wt-purple to-wt-pink text-white shadow-md shadow-wt-pink/20'
                    : 'bg-wt-surface text-gray-300 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre filter */}
      <div className="mx-4 mt-4 rounded-2xl bg-wt-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wt-pink/15">
              <FontAwesomeIcon icon={faFilm} className="text-wt-pink" />
            </div>
            <h2 className="text-base font-semibold text-white">Genres</h2>
            {selectedGenres.length > 0 && (
              <span className="rounded-full bg-wt-pink/20 px-2 py-0.5 text-[10px] font-bold text-wt-pink">
                {selectedGenres.length}
              </span>
            )}
          </div>
          {selectedGenres.length > 0 && (
            <button
              onClick={() => setGenres([])}
              className="text-xs font-medium text-gray-400 hover:text-white"
            >
              Zurücksetzen
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-400">
          Nur Titel mit diesen Genres anzeigen. Ohne Auswahl alle.
        </p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre.id);
            return (
              <button
                key={genre.id}
                onClick={() => toggleGenre(genre.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                  selected
                    ? 'bg-gradient-to-r from-wt-purple to-wt-pink text-white shadow-md shadow-wt-pink/20'
                    : 'bg-wt-surface text-gray-300 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{genre.emoji}</span>
                {genre.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rechtliches */}
      <div className="mx-4 mt-4 rounded-2xl bg-wt-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wt-purple/15">
            <FontAwesomeIcon icon={faCircleInfo} className="text-wt-purple-lighter" />
          </div>
          <h2 className="text-base font-semibold text-white">Rechtliches</h2>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Datenschutzerklärung', icon: faShieldHalved, url: 'https://watchtwin.de/datenschutzerklaerung/' },
            { label: 'Nutzungsbedingungen', icon: faFileLines, url: 'https://watchtwin.de/nutzungsbedingungen/' },
            { label: 'Impressum', icon: faCircleInfo, url: 'https://watchtwin.de/impressum/' },
          ].map((item) => (
            <button
              key={item.url}
              onClick={async () => {
                try {
                  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
                  if (cap?.isNativePlatform?.()) {
                    const { Browser } = await import('@capacitor/browser');
                    await Browser.open({ url: item.url });
                    return;
                  }
                } catch {}
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-wt-surface px-3 py-2.5 text-sm text-gray-200 transition-colors hover:text-white"
            >
              <FontAwesomeIcon icon={item.icon} className="text-wt-purple-lighter" />
              <span className="flex-1 text-left">{item.label}</span>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[11px] text-gray-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3 px-4 pb-8">
        <button
          onClick={resetDeck}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-wt-surface py-3 text-sm font-medium text-gray-300 hover:bg-wt-surface"
        >
          <FontAwesomeIcon icon={faRotateLeft} />
          Swipe-Deck zurücksetzen
        </button>
        <button
          onClick={handleResetAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-sm font-medium text-red-400 hover:bg-red-500/20"
        >
          <FontAwesomeIcon icon={faTrash} />
          Alle Daten zurücksetzen
        </button>
        {user && (
          <button
            onClick={handleDeleteAccount}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/20 py-3 text-sm font-bold text-red-300 ring-1 ring-red-500/40 hover:bg-red-600/30"
          >
            <FontAwesomeIcon icon={faTrash} />
            Konto endgültig löschen
          </button>
        )}

        {/* TMDB Attribution (Pflicht laut TMDB API-Nutzungsbedingungen) */}
        <div className="mt-6 flex flex-col items-center gap-2 pt-4 text-center">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-80 transition-opacity hover:opacity-100"
            aria-label="The Movie Database"
          >
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="TMDB"
              className="h-4"
            />
          </a>
          <p className="px-6 text-[10px] leading-tight text-gray-500">
            Diese Anwendung nutzt die TMDB API, ist jedoch nicht von TMDB unterstützt oder zertifiziert.
          </p>
        </div>
      </div>
    </div>
  );
}
