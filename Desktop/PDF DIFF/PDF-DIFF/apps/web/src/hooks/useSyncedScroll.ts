/**
 * useSyncedScroll Hook
 * Manages synchronized scrolling and zoom between two PDFs
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface SyncedScrollState {
  scrollTop: number;
  zoomLevel: number;
  containerHeight: number;
}

export function useSyncedScroll() {
  const [scrollState, setScrollState] = useState<SyncedScrollState>({
    scrollTop: 0,
    zoomLevel: 100,
    containerHeight: 0,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced scroll handler
  const handleScroll = useCallback(
    (scrollTop: number, containerHeight: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setScrollState((prev) => ({
          ...prev,
          scrollTop,
          containerHeight,
        }));
      }, 100); // 100ms debounce
    },
    []
  );

  const handleZoom = useCallback((zoomLevel: number) => {
    setScrollState((prev) => ({
      ...prev,
      zoomLevel,
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...scrollState,
    handleScroll,
    handleZoom,
  };
}
