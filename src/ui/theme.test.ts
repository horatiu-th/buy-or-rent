import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { t } from '../i18n';
import { THEMES } from './theme';

const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf8');

/** The custom properties a theme block sets, e.g. { paper: '#f5f7f9', … }. */
function tokensOf(theme: string): Record<string, string> {
  const block = css.match(new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`))?.[1];
  if (!block) return {};
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const REFERENCE = Object.keys(tokensOf('light'));

describe.each(THEMES)('theme %s', (theme) => {
  const tk = tokensOf(theme);

  it('sets every colour the light theme sets, and has a name', () => {
    expect(Object.keys(tk).sort()).toEqual([...REFERENCE].sort());
    expect(t.themes[theme]).toBeTruthy();
  });

  it.each([
    ['ink', 'paper', 4.5], ['muted', 'paper', 4.5], ['muted', 'field', 4.5],
    ['buyer', 'surface', 4.5], ['buyer', 'paper', 4.5], ['renter-text', 'paper', 4.5], ['renter-text', 'surface', 4.5],
    ['ink', 'buyer-soft', 4.5], ['renter', 'surface', 3], ['control-line', 'surface', 3],
  ] as const)('keeps %s on %s at %s:1 or more', (fg, bg, min) => {
    expect(contrast(tk[fg], tk[bg])).toBeGreaterThanOrEqual(min);
  });
});
