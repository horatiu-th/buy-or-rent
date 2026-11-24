import { useCallback, useEffect, useState } from 'react';

/** Every theme's colours live in styles.css under [data-theme='<id>']. */
export const THEMES = ['light', 'dark', 'sand', 'midnight', 'graphite', 'contrast'] as const;
export type ThemeId = (typeof THEMES)[number];
/** 'system' follows the operating system's light or dark setting. */
export type ThemeChoice = ThemeId | 'system';

const KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const isChoice = (v: unknown): v is ThemeChoice => v === 'system' || THEMES.includes(v as ThemeId);

function storedChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return isChoice(t) ? t : 'system';
  } catch {
    return 'system';
  }
}

const systemPrefersDark = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;

/**
 * The page theme. The choice is remembered; 'system' tracks the operating system's setting,
 * including when it changes while the page is open. The same rule runs inline in index.html
 * before first paint, so the page never flashes the wrong theme.
 */
export function useTheme() {
  const [choice, setChoiceState] = useState<ThemeChoice>(storedChoice);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const resolved: ThemeId = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private modes can refuse storage; the theme still applies for this visit.
    }
  }, []);

  return { choice, resolved, setChoice };
}
