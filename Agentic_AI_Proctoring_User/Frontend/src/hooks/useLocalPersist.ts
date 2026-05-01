import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook to persist state in localStorage.
 * @param key The localStorage key.
 * @param initialValue The initial value if nothing is found in localStorage.
 */
export function useLocalPersist<T>(key: string, initialValue: T) {
  // Load initial state from localStorage or use initialValue
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
    }
    return initialValue;
  });

  // Update localStorage whenever state changes
  useEffect(() => {
    if (state === undefined || state === null) {
      // Don't persist empty/null states unless explicitly intended
      // This helps avoid overwriting good data with empty data during initialization
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, state]);

  // Function to clear the specific key
  const clear = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return [state, setState, clear] as const;
}
