import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faBookmark, faUser, faUserGroup } from '@fortawesome/free-solid-svg-icons';

const tabs = [
  { path: '/swipe', label: 'Entdecken', icon: faFilm },
  { path: '/watchlist', label: 'Watchlist', icon: faBookmark },
  { path: '/friends', label: 'Freunde', icon: faUserGroup },
  { path: '/profile', label: 'Profil', icon: faUser },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const watchlistCount = useStore((s) => s.watchlist.length);

  return (
    <nav className="flex items-center justify-around border-t border-wt-surface bg-wt-dark px-2 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              isActive ? 'text-wt-pink' : 'text-gray-500'
            }`}
          >
            <FontAwesomeIcon icon={tab.icon} className="text-lg" />
            <span>{tab.label}</span>
            {tab.path === '/watchlist' && watchlistCount > 0 && (
              <span className="absolute right-1/4 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-wt-pink text-[10px] font-bold text-white">
                {watchlistCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
