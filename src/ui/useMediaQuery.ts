import { useCallback, useSyncExternalStore } from 'react';

const supported = () => typeof window.matchMedia === 'function';

/** Whether a CSS media query matches, kept current as it changes. False where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (!supported()) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => supported() && window.matchMedia(query).matches, () => false);
}
