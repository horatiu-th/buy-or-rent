import type { Inputs } from '../engine';
import type { PropertyType } from '../data/defaults';
import { DEFAULT_CITY_ID } from '../data/schema';
import type { Currency } from '../ui/format';
import { FIELDS, normalizeField } from '../ui/fields';

export interface Scenario {
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  currency: Currency;
  real: boolean;
  overrides: Partial<Inputs>;
}

export const DEFAULT_SCENARIO: Scenario = {
  cityId: DEFAULT_CITY_ID,
  propertyType: 'existing',
  sqm: 55,
  currency: 'RON',
  // Today's money by default: nominal sums decades out look large and hide inflation's effect on cash.
  real: true,
  overrides: {},
};

export const SQM_MIN = 10;
export const SQM_MAX = 500;

const FIELD_DEFS = new Map(FIELDS.map((f) => [f.key, f]));

export const clampSqm = (n: number) => Math.min(SQM_MAX, Math.max(SQM_MIN, n));

/** Fields whose defaults scale with the home itself: its city, type and area. */
const PLACE_DERIVED = ['price', 'rent'] as const satisfies readonly (keyof Inputs)[];

/**
 * Applies a change to the city, type, area or view. A new place means a different home, so an
 * edited price or rent is dropped and the new place's own values show; other edits (loan terms,
 * growth rates) are about the financing and the market rather than this home, so they stay.
 */
export function applyScenarioPatch(s: Scenario, patch: Partial<Omit<Scenario, 'overrides'>>): Scenario {
  const next = { ...s, ...patch };
  const placeChanged = next.cityId !== s.cityId || next.propertyType !== s.propertyType || next.sqm !== s.sqm;
  if (!placeChanged || !PLACE_DERIVED.some((k) => k in s.overrides)) return next;
  const overrides = { ...s.overrides };
  for (const k of PLACE_DERIVED) delete overrides[k];
  return { ...next, overrides };
}

export function encodeScenario(s: Scenario): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_SCENARIO;
  if (s.cityId !== d.cityId) p.set('oras', s.cityId);
  if (s.propertyType !== d.propertyType) p.set('tip', s.propertyType);
  if (s.sqm !== d.sqm) p.set('mp', String(s.sqm));
  if (s.currency !== d.currency) p.set('moneda', s.currency);
  if (s.real !== d.real) p.set('real', s.real ? '1' : '0');
  for (const [k, v] of Object.entries(s.overrides)) {
    p.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return p;
}

/**
 * Links are untrusted input: anything malformed falls back to the default, and numbers are
 * clamped to the field limits so an absurd value (e.g. a 5000-year horizon) can't stall the page.
 */
export function decodeScenario(p: URLSearchParams, validCityIds?: readonly string[]): Scenario {
  const d = DEFAULT_SCENARIO;
  const rawSqm = p.get('mp');
  const sqmNum = Number(rawSqm);
  const sqm = rawSqm === null || rawSqm === '' || !Number.isFinite(sqmNum)
    ? d.sqm
    : clampSqm(sqmNum);
  const overrides: Partial<Inputs> = {};
  for (const [k, raw] of p.entries()) {
    const def = FIELD_DEFS.get(k as keyof Inputs);
    if (!def) continue;
    if (def.unit === 'bool') {
      if (raw === '0' || raw === '1') (overrides as Record<string, boolean>)[k] = raw === '1';
    } else {
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n)) continue;
      (overrides as Record<string, number>)[k] = normalizeField(def, n);
    }
  }
  const city = p.get('oras');
  return {
    cityId: city !== null && (!validCityIds || validCityIds.includes(city)) ? city : d.cityId,
    propertyType: p.get('tip') === 'new' ? 'new' : p.get('tip') === 'existing' ? 'existing' : d.propertyType,
    sqm,
    currency: p.get('moneda') === 'EUR' ? 'EUR' : d.currency,
    real: p.get('real') === '1' ? true : p.get('real') === '0' ? false : d.real,
    overrides,
  };
}
