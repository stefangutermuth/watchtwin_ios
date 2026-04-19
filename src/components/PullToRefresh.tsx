import { useState, useRef, type ReactNode, type TouchEvent } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { hapticLight } from '../services/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Schwelle ab der bei Loslassen refreshed wird. Default 70px */
  threshold?: number;
}

/**
 * Einfache iOS-style Pull-to-Refresh-Komponente.
 * Funktioniert nur wenn das Scroll-Top === 0 ist.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hapticTriggeredRef = useRef(false);

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (refreshing) return;
    // Nur starten wenn oben gescrollt
    if ((containerRef.current?.scrollTop ?? 0) > 0) {
      startYRef.current = null;
      return;
    }
    startYRef.current = e.touches[0].clientY;
    hapticTriggeredRef.current = false;
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Resistance: schwerer je weiter gezogen wird
    const distance = Math.min(delta * 0.5, threshold * 1.6);
    setPullDistance(distance);

    // Haptic-Tick wenn Schwelle erreicht
    if (distance >= threshold && !hapticTriggeredRef.current) {
      hapticTriggeredRef.current = true;
      hapticLight();
    } else if (distance < threshold) {
      hapticTriggeredRef.current = false;
    }
  }

  async function handleTouchEnd() {
    if (refreshing) return;
    startYRef.current = null;
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }

  const progress = Math.min(pullDistance / threshold, 1);
  const iconRotation = progress * 180;

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Spinner über Content */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 5 ? 1 : 0,
          transition: startYRef.current === null ? 'height 0.25s ease, opacity 0.25s ease' : 'none',
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wt-card shadow-lg ring-1 ring-white/10">
          {refreshing ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm text-wt-pink" />
          ) : (
            <motion.div
              animate={{ rotate: iconRotation }}
              transition={{ duration: 0.15 }}
            >
              <FontAwesomeIcon
                icon={faArrowDown}
                className={`text-sm ${progress >= 1 ? 'text-wt-pink' : 'text-gray-400'}`}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Content verschoben nach unten während Pull */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: startYRef.current === null ? 'transform 0.25s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
