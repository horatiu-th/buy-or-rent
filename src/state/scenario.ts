import { clamp, type Inputs } from '../engine';
import { DEFAULT_CITY_ID } from '../data/schema';
import { BASE_CURRENCY, isCurrency, type Currency } from '../ui/money';
import { fieldDef, normalizeField } from '../ui/fields';

export interface Scenario {
  cityId: string;
  sqm: number;
  currency: Currency;
  real: boolean;
  overrides: Partial<Inputs>;
}

export const DEFAULT_SCENARIO: Scenario = {
  cityId: DEFAULT_CITY_ID,
  sqm: 55,
  currency: BASE_CURRENCY,
  // Today's money by default: nominal sums decades out look large and hide inflation's effect on cash.
  real: true,
  overrides: {},
};

export const SQM_MIN = 10;
export const SQM_MAX = 500;

export const clampSqm = (n: number) => clamp(n, SQM_MIN, SQM_MAX);

/** The parts of a scenario that pick the home and the view; edits to inputs go through their own setters. */
export type ScenarioPatch = Partial<Omit<Scenario, 'overrides'>>;

/** Fields whose defaults scale with the home itself: its city and area. */
const PLACE_DERIVED = ['price', 'rent', 'propertyTaxAnnual'] as const satisfies readonly (keyof Inputs)[];

/**
 * Applies a change to the city, area or view. A new place means a different home, so an
 * edited price or rent is dropped and the new place's own values show; other edits (loan terms,
 * growth rates) are about the financing and the market rather than this home, so they stay.
 */
export function applyScenarioPatch(s: Scenario, patch: ScenarioPatch): Scenario {
  const next = { ...s, ...patch };
  const placeChanged = next.cityId !== s.cityId || next.sqm !== s.sqm;
  if (!placeChanged || !PLACE_DERIVED.some((k) => k in s.overrides)) return next;
  const overrides = { ...s.overrides };
  for (const k of PLACE_DERIVED) delete overrides[k];
  return { ...next, overrides };
}

const encodeBool = (b: boolean) => (b ? '1' : '0');

/** '1' or '0', as encodeBool writes them; anything else is not a boolean. */
const parseBool = (raw: string | null) => (raw === '1' ? true : raw === '0' ? false : null);

/** A finite number, or null for a missing, empty or non-numeric parameter. */
function parseNum(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function encodeScenario(s: Scenario): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_SCENARIO;
  if (s.cityId !== d.cityId) p.set('oras', s.cityId);
  if (s.sqm !== d.sqm) p.set('mp', String(s.sqm));
  if (s.currency !== d.currency) p.set('moneda', s.currency);
  if (s.real !== d.real) p.set('real', encodeBool(s.real));
  for (const [k, v] of Object.entries(s.overrides)) {
    p.set(k, typeof v === 'boolean' ? encodeBool(v) : String(v));
  }
  return p;
}

/**
 * Links are untrusted input: anything malformed falls back to the default, and numbers are
 * clamped to the field limits so an absurd value (e.g. a 5000-year horizon) can't stall the page.
 */
export function decodeScenario(p: URLSearchParams, validCityIds?: readonly string[]): Scenario {
  const d = DEFAULT_SCENARIO;
  const overrides: Partial<Inputs> = {};
  for (const [k, raw] of p.entries()) {
    const def = fieldDef(k);
    if (!def) continue;
    if (def.unit === 'bool') {
      const b = parseBool(raw);
      if (b !== null) overrides[def.key] = b;
    } else {
      const n = parseNum(raw);
      if (n !== null) overrides[def.key] = normalizeField(def, n);
    }
  }
  const sqm = parseNum(p.get('mp'));
  const city = p.get('oras');
  const currency = p.get('moneda');
  return {
    cityId: city !== null && (!validCityIds || validCityIds.includes(city)) ? city : d.cityId,
    sqm: sqm === null ? d.sqm : clampSqm(sqm),
    currency: isCurrency(currency) ? currency : d.currency,
    real: parseBool(p.get('real')) ?? d.real,
    overrides,
  };
}
