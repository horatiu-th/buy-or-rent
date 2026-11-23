import type { Range } from './validate';

export interface Fetcher {
  /** Path in the data file, e.g. "values.eurRon" or "cities.cluj.rentSqmEur". */
  path: string;
  unit: string;
  source: string;
  sourceUrl: string;
  range: Range;
  fetch: () => Promise<{ value: number; asOf: string }>;
}
