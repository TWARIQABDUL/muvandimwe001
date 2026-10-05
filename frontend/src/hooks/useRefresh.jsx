import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Every screen loads its own data, so rather than wiring a refresh handler through
// each one, pages add `refreshKey` to their fetch effect and re-run when it changes.
const RefreshContext = createContext({ refreshKey: 0, refresh: () => {}, isRefreshing: false });

export function RefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef(null);

  const refresh = useCallback(() => {
    setRefreshKey(key => key + 1);
    setIsRefreshing(true);

    // Screens fetch independently and show their own spinners; hold the pull
    // indicator briefly so the gesture reads as having done something.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsRefreshing(false), 900);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshKey, refresh, isRefreshing }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
