import type { Inputs } from '../engine';
import type { PropertyType } from '../data/defaults';
import type { Currency } from '../ui/format';
import { FIELDS } from '../ui/fields';

export interface Scenario {
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  currency: Currency;
  real: boolean;
  overrides: Partial<Inputs>;
}

export const DEFAULT_SCENARIO: Scenario = {
  cityId: 'bucuresti',
  propertyType: 'existing',
  sqm: 55,
  currency: 'RON',
  real: false,
  overrides: {},
};

const FIELD_UNITS = new Map(FIELDS.map((f) => [f.key, f.unit]));

export function encodeScenario(s: Scenario): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_SCENARIO;
  if (s.cityId !== d.cityId) p.set('oras', s.cityId);
  if (s.propertyType !== d.propertyType) p.set('tip', s.propertyType);
  if (s.sqm !== d.sqm) p.set('mp', String(s.sqm));
  if (s.currency !== d.currency) p.set('moneda', s.currency);
  if (s.real !== d.real) p.set('real', '1');
  for (const [k, v] of Object.entries(s.overrides)) {
    p.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return p;
}

export function decodeScenario(p: URLSearchParams): Scenario {
  const d = DEFAULT_SCENARIO;
  const sqm = Number(p.get('mp'));
  const overrides: Partial<Inputs> = {};
  for (const [k, raw] of p.entries()) {
    const unit = FIELD_UNITS.get(k as keyof Inputs);
    if (!unit) continue;
    if (unit === 'bool') {
      (overrides as Record<string, boolean>)[k] = raw === '1';
    } else {
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n)) (overrides as Record<string, number>)[k] = n;
    }
  }
  return {
    cityId: p.get('oras') ?? d.cityId,
    propertyType: p.get('tip') === 'new' ? 'new' : p.get('tip') === 'existing' ? 'existing' : d.propertyType,
    sqm: Number.isFinite(sqm) && sqm > 0 ? sqm : d.sqm,
    currency: p.get('moneda') === 'EUR' ? 'EUR' : d.currency,
    real: p.get('real') === '1',
    overrides,
  };
}
