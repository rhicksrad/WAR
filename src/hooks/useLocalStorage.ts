import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage(key: string, defaultValue: string | null = null) {
  const [value, setValue] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const stored = window.localStorage.getItem(key);
      return stored ?? defaultValue;
    } catch (error) {
      console.warn('Unable to read localStorage key', key, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Unable to persist localStorage key', key, error);
    }
  }, [key, value]);

  const clear = useCallback(() => setValue(null), []);

  return { value, setValue, clear } as const;
}
