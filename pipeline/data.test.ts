import { readFileSync } from 'node:fs';
import { mergeData } from './mergeData';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const auto = read('data/auto.json');
const overrides = read('data/overrides.json');

describe('the committed data files', () => {
  it('merge cleanly', () => {
    expect(() => mergeData(auto, overrides, '2026-11-23')).not.toThrow();
  });

  it('have no override shadowing a fetched value', () => {
    const { warnings } = mergeData(auto, overrides, '2026-11-23');
    expect(warnings.filter((w) => w.includes('both'))).toEqual([]);
  });

  it('give IRCC an expiry, so the quarterly change is flagged', () => {
    expect(overrides.values.ircc.validUntil).toBe('2026-12-31');
    expect(mergeData(auto, overrides, '2027-01-01').warnings).toContainEqual(expect.stringMatching(/ircc/));
  });
});
