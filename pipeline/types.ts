import type { DataPath, PartialDataFile } from '../src/data/schema';
import type { Range } from './validate';

export interface Fetcher {
  path: DataPath;
  unit: string;
  source: string;
  sourceUrl: string;
  range: Range;
  /** Largest relative change from the stored value accepted in one step, e.g. 0.05 for 5%. */
  maxJump: number;
  /** The stored value is marked stale once its asOf is older than this. */
  maxAgeDays: number;
  fetch: () => Promise<{ value: number; asOf: string }>;
}

/** A fetched value that moved more than maxJump, waiting for a later run to confirm it. */
export interface PendingCandidate { value: number; asOf: string; reason?: string }

/** data/auto.json: fetched values, plus candidates held back by the jump check. */
export interface AutoDataFile extends PartialDataFile {
  pending?: Partial<Record<DataPath, PendingCandidate>>;
}
