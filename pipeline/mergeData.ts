import {
  REQUIRED_CITY_KEYS, REQUIRED_VALUE_KEYS,
  type CityData, type DataFile, type PartialDataFile,
} from '../src/data/schema';

export function mergeData(auto: PartialDataFile, overrides: PartialDataFile): DataFile {
  const values = { ...auto.values, ...overrides.values };
  for (const k of REQUIRED_VALUE_KEYS) {
    if (!values[k]) throw new Error(`Missing required value: ${k}`);
  }

  const cityIds = new Set([...Object.keys(auto.cities ?? {}), ...Object.keys(overrides.cities ?? {})]);
  const cities: Record<string, CityData> = {};
  for (const id of cityIds) {
    const merged = { ...auto.cities?.[id], ...overrides.cities?.[id] };
    for (const k of REQUIRED_CITY_KEYS) {
      if (!merged[k]) throw new Error(`City ${id} is missing ${k}`);
    }
    cities[id] = merged as CityData;
  }
  if (cityIds.size === 0) throw new Error('No cities defined');
  return { values, cities };
}
