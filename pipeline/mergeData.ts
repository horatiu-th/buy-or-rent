import {
  CITY_VALUE_KEYS, DEFAULT_CITY_ID, REQUIRED_CITY_KEYS, REQUIRED_VALUE_KEYS,
  type CityData, type DataFile, type PartialDataFile, type SourcedValue, type ValueKey,
} from '../src/data/schema';
import { todayIso } from './dates';
import { CITY_RANGES, VALUE_RANGES } from './ranges';
import { sourcedValueProblems } from './validate';

export interface MergeResult { data: DataFile; warnings: string[] }

const CITY_FIELDS = new Set<string>(['name', ...CITY_VALUE_KEYS]);
const isValueKey = (k: string): k is ValueKey => (REQUIRED_VALUE_KEYS as readonly string[]).includes(k);

/**
 * Combines fetched and hand-maintained data, overrides winning. Throws one error listing every
 * malformed or missing entry, so a bad edit can't reach the bundled defaults.
 */
export function mergeData(auto: PartialDataFile, overrides: PartialDataFile, today = todayIso()): MergeResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const shadowed = (where: string, inAuto: unknown, inOverrides: unknown) => {
    if (inAuto !== undefined && inOverrides !== undefined) {
      warnings.push(`${where} is in both data/auto.json and data/overrides.json; the override wins and the fetched value is ignored`);
    }
  };
  const inspect = (where: string, v: SourcedValue, range: { min: number; max: number }) => {
    for (const p of sourcedValueProblems(v, range)) errors.push(`${where}: ${p}`);
    if (typeof v?.validUntil === 'string' && v.validUntil < today) {
      warnings.push(`${where} was only valid until ${v.validUntil}; check the source and update it`);
    }
  };

  const values = { ...auto.values, ...overrides.values };
  for (const k of REQUIRED_VALUE_KEYS) if (!values[k]) errors.push(`Missing required value: ${k}`);
  for (const [k, v] of Object.entries(values)) {
    if (!isValueKey(k)) { errors.push(`values.${k}: unknown key (see REQUIRED_VALUE_KEYS in src/data/schema.ts)`); continue; }
    shadowed(`values.${k}`, auto.values?.[k], overrides.values?.[k]);
    inspect(`values.${k}`, v, VALUE_RANGES[k]);
  }

  const cityIds = new Set([...Object.keys(auto.cities ?? {}), ...Object.keys(overrides.cities ?? {})]);
  const cities: Record<string, CityData> = {};
  for (const id of cityIds) {
    const a = auto.cities?.[id];
    const o = overrides.cities?.[id];
    const merged = { ...a, ...o };
    for (const k of REQUIRED_CITY_KEYS) if (!merged[k]) errors.push(`City ${id} is missing ${k}`);
    for (const k of Object.keys(merged)) if (!CITY_FIELDS.has(k)) errors.push(`cities.${id}.${k}: unknown field`);
    if (merged.name !== undefined && (typeof merged.name !== 'string' || merged.name.trim() === '')) {
      errors.push(`cities.${id}.name must be a non-empty string`);
    }
    for (const k of CITY_VALUE_KEYS) {
      const v = merged[k];
      if (v === undefined) continue;
      shadowed(`cities.${id}.${k}`, a?.[k], o?.[k]);
      inspect(`cities.${id}.${k}`, v, CITY_RANGES[k]);
    }
    cities[id] = merged as CityData;
  }
  if (cityIds.size === 0) errors.push('No cities defined');
  else if (!cityIds.has(DEFAULT_CITY_ID)) errors.push(`Default city "${DEFAULT_CITY_ID}" (DEFAULT_CITY_ID) is missing`);

  if (errors.length) throw new Error(`Invalid data:\n  ${errors.join('\n  ')}`);
  return { data: { values, cities }, warnings };
}
