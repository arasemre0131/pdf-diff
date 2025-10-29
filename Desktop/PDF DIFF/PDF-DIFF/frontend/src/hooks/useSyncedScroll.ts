import { useState, useCallback, useRef, useEffect } from 'react';
interface SyncedScrollState {
  scrollTop: number;
  zoomLevel: number;
  containerHeight: number;
}
export function useSyncedScroll() {
  const [scrollState, setScrollState] = useState<SyncedScrollState>({ scrollTop: 0, zoomLevel: 100, containerHeight: 0 });
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const handleScroll = useCallback((scrollTop: number, containerHeight: number) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setScrollState((prev) => ({ ...prev, scrollTop, containerHeight }));
    }, 100);
  }, []);
  const handleZoom = useCallback((zoomLevel: number) => {
    setScrollState((prev) => ({ ...prev, zoomLevel }));
  }, []);
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);
  return { ...scrollState, handleScroll, handleZoom };
}
