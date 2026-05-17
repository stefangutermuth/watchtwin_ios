import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { ProviderSelect } from '../components/ProviderSelect';
import { SwipeTutorial } from '../components/SwipeTutorial';
import { useStore } from '../store/useStore';
import { GENRES } from '../data/genres';
import { requestNotificationPermission } from '../services/localNotifications';

export function OnboardingPage() {
  const navigate = useNavigate();
  const selectedProviders = useStore((s) => s.selectedProviders);
  const selectedGenres = useStore((s) => s.selectedGenres);
  const toggleGenre = useStore((s) => s.toggleGenre);
  const setOnboardingDone = useStore((s) => s.setOnboardingDone);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  async function handleFinish() {
    // Permission für Reminder anfragen (skippable — wenn abgelehnt, einfach weiter)
    try {
      await requestNotificationPermission();
    } catch {
      // ignore – User kann später in Settings aktivieren
    }
    setOnboardingDone(true);
    navigate('/swipe');
  }

  return (
    <div className="flex h-full flex-col bg-wt-dark px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      {/* Step indicator — 3 segments */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-wt-pink' : 'bg-wt-surface'}`} />
        <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-wt-pink' : 'bg-wt-surface'}`} />
        <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 3 ? 'bg-wt-pink' : 'bg-wt-surface'}`} />
      </div>

      {/* Logo area */}
      <div className="flex flex-col items-center">
        <img src="/logo.png" alt="WatchTwin" className="h-10" />
        <p className="mt-1 text-xs text-gray-400">Swipe. Watch. Repeat.</p>
      </div>

      {/* Step 1 — Anbieter */}
      {step === 1 && (
        <>
          <div className="mt-6 flex-1 overflow-y-auto">
            <h2 className="mb-1 text-lg font-semibold text-white">
              Deine Streaming-Dienste
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Wähle die Anbieter, die du nutzt. Du siehst nur Inhalte, die dort
              verfügbar sind.
            </p>
            <ProviderSelect />

            {/* Hinweis: jederzeit änderbar */}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-wt-card/60 p-3 ring-1 ring-white/5">
              <FontAwesomeIcon
                icon={faCircleInfo}
                className="mt-0.5 shrink-0 text-sm text-wt-pink"
              />
              <p className="text-xs leading-relaxed text-gray-400">
                Du kannst deine Anbieter jederzeit im Profil ändern.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={selectedProviders.length === 0}
              className="w-full rounded-xl bg-wt-pink py-4 text-lg font-bold text-white transition-all hover:bg-wt-pink-light disabled:opacity-30 disabled:hover:bg-wt-pink"
            >
              Weiter ({selectedProviders.length} ausgewählt)
            </button>
          </div>
        </>
      )}

      {/* Step 2 — Genres */}
      {step === 2 && (
        <>
          <div className="mt-6 flex-1 overflow-y-auto">
            <h2 className="mb-1 text-lg font-semibold text-white">
              Was schaust du gerne?
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Wähle deine Lieblingsgenres, um relevantere Vorschläge zu bekommen.
              Keine Auswahl = alle Genres.
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const selected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
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

            {/* Hinweis: jederzeit änderbar */}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-wt-card/60 p-3 ring-1 ring-white/5">
              <FontAwesomeIcon
                icon={faCircleInfo}
                className="mt-0.5 shrink-0 text-sm text-wt-pink"
              />
              <p className="text-xs leading-relaxed text-gray-400">
                Du kannst deine Genres jederzeit im Profil anpassen — überspringe
                den Schritt mit „Weiter", wenn du alles sehen willst.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-wt-card text-gray-400 transition-colors hover:text-white"
              aria-label="Zurück"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-wt-pink py-4 text-lg font-bold text-white transition-all hover:bg-wt-pink-light"
            >
              {selectedGenres.length > 0
                ? `Weiter (${selectedGenres.length})`
                : 'Weiter (Alle)'}
            </button>
          </div>
        </>
      )}

      {/* Step 3 — Tutorial */}
      {step === 3 && (
        <>
          <div className="mt-3 flex-1">
            <h2 className="text-center text-lg font-semibold text-white">
              So funktioniert's
            </h2>
            <p className="mt-0.5 text-center text-sm text-gray-400">
              Swipe die Karte in eine der 4 Richtungen
            </p>
            <SwipeTutorial />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setStep(2)}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-wt-card text-gray-400 transition-colors hover:text-white"
              aria-label="Zurück"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 rounded-xl bg-gradient-to-r from-wt-purple to-wt-pink py-4 text-lg font-bold text-white shadow-lg shadow-wt-pink/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Los geht's 🎬
            </button>
          </div>
        </>
      )}
    </div>
  );
}
