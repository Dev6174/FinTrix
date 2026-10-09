import { useEffect, useState } from 'react';

/** useState mirrored to localStorage for layout prefs. Falls back silently when storage is blocked. */
export function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* session-only */
    }
  }, [key, v]);
  return [v, setV];
}
