import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { OnboardingPage } from './pages/OnboardingPage';
import { SwipePage } from './pages/SwipePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useStore } from './store/useStore';
import { loadUserData, debouncedSaveUserData } from './services/firestoreSync';
import { ensureUserProfile } from './services/friendsService';
import { initializeAds } from './services/ads';
import { initializePurchases, checkPremiumStatus } from './services/purchases';
import {
  initializeNotifications,
  scheduleAllReminders,
} from './services/localNotifications';
import { FriendsPage } from './pages/FriendsPage';
import { FriendDetailPage } from './pages/FriendDetailPage';
import { SwipePartyPage } from './pages/SwipePartyPage';
import { SplashScreen } from './components/SplashScreen';
import { LoadingScreen } from './components/LoadingScreen';

function AppLayout() {
  return (
    <div className="flex h-full flex-col bg-wt-dark">
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/swipe" element={<SwipePage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friends/:uid" element={<FriendDetailPage />} />
          <Route path="/party/:id" element={<SwipePartyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/swipe" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const onboardingDone = useStore((s) => s.onboardingDone);
  const hydrateFromCloud = useStore((s) => s.hydrateFromCloud);

  // Cloud sync: subscribe to relevant store changes
  const watchlist = useStore((s) => s.watchlist);
  const skippedIds = useStore((s) => s.skippedIds);
  const selectedProviders = useStore((s) => s.selectedProviders);
  const isPremium = useStore((s) => s.isPremium);
  const contentFilter = useStore((s) => s.contentFilter);
  const selectedLanguages = useStore((s) => s.selectedLanguages);
  const selectedGenres = useStore((s) => s.selectedGenres);
  const storeOnboardingDone = useStore((s) => s.onboardingDone);

  const setPremium = useStore((s) => s.setPremium);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Initialize Ads + Purchases on mount
  useEffect(() => {
    initializeAds();
    initializePurchases().then(() => {
      checkPremiumStatus().then((premium) => {
        if (premium) setPremium(true);
      });
    });
    initializeNotifications();
  }, [setPremium]);

  // Re-schedule reminders when settings or watchlist count change
  const notificationSettings = useStore((s) => s.notificationSettings);
  useEffect(() => {
    if (!onboardingDone) return; // erst nach Onboarding (Permission)
    scheduleAllReminders(notificationSettings, watchlist.length);
  }, [notificationSettings, watchlist.length, onboardingDone]);

  // Load data from Firestore on login
  useEffect(() => {
    if (!user) {
      setCloudLoaded(false);
      return;
    }
    if (cloudLoaded) return;

    setCloudLoading(true);
    loadUserData(user.uid)
      .then((data) => {
        if (data) {
          hydrateFromCloud(data);
        }
        // Sicherstellen, dass User ein Profil mit friendCode hat
        return ensureUserProfile(
          user.uid,
          user.displayName,
          user.photoURL
        );
      })
      .catch((err) => console.error('Failed to load cloud data:', err))
      .finally(() => {
        setCloudLoading(false);
        setCloudLoaded(true);
      });
  }, [user, cloudLoaded, hydrateFromCloud]);

  // Sync changes to Firestore (debounced)
  useEffect(() => {
    if (!user || !cloudLoaded) return;
    debouncedSaveUserData(user.uid, {
      watchlist,
      skippedIds,
      selectedProviders,
      isPremium,
      onboardingDone: storeOnboardingDone,
      contentFilter,
      selectedLanguages,
      selectedGenres,
    });
  }, [
    user,
    cloudLoaded,
    watchlist,
    skippedIds,
    selectedProviders,
    isPremium,
    storeOnboardingDone,
    contentFilter,
    selectedLanguages,
    selectedGenres,
  ]);

  // Auth loading
  if (authLoading) {
    return <LoadingScreen message="Laden..." />;
  }

  // Cloud data loading (only when logged in)
  if (user && cloudLoading) {
    return <LoadingScreen message="Daten synchronisieren..." />;
  }

  // Guest or logged-in: show onboarding or app
  return (
    <Routes>
      {!onboardingDone ? (
        <Route path="*" element={<OnboardingPage />} />
      ) : (
        <>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/*" element={<AppLayout />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
