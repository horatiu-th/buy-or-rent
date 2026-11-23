import { runFetchers } from './runFetchers';
import type { AutoDataFile, Fetcher } from './types';

const TODAY = '2026-11-23';

const fetcher = (result: { value: number; asOf: string } | Error): Fetcher => ({
  path: 'values.eurRon', unit: 'lei/€', source: 'BNR', sourceUrl: 'https://example',
  range: { min: 4.5, max: 6.5 }, maxJump: 0.05, maxAgeDays: 10,
  fetch: async () => { if (result instanceof Error) throw result; return result; },
});

const entry = (value: number, asOf: string, status: 'ok' | 'stale' = 'ok') =>
  ({ value, unit: 'lei/€', source: 'BNR', sourceUrl: 'https://example', asOf, status });
const prevFile = (asOf = '2026-11-20', extra: Partial<AutoDataFile> = {}): AutoDataFile =>
  ({ values: { eurRon: entry(5.3485, asOf) }, ...extra });

const run = (f: Fetcher, prev: AutoDataFile, today = TODAY) => runFetchers([f], prev, today);

describe('runFetchers', () => {
  it('writes a valid new value as ok', async () => {
    const { data, report, changed } = await run(fetcher({ value: 5.36, asOf: '2026-11-23' }), prevFile());
    expect(data.values?.eurRon).toMatchObject({ value: 5.36, status: 'ok', asOf: '2026-11-23' });
    expect(report[0].outcome).toBe('updated');
    expect(changed).toBe(true);
  });

  it('reports no change when the source returns the value already stored', async () => {
    const prev = prevFile();
    const { data, report, changed } = await run(fetcher({ value: 5.3485, asOf: '2026-11-20' }), prev);
    expect(data).toEqual(prev);
    expect(report[0].outcome).toBe('unchanged');
    expect(changed).toBe(false);
  });

  describe('when the fetch fails', () => {
    it('leaves a recent value untouched, so no update is proposed', async () => {
      const prev = prevFile();
      const { data, report, changed } = await run(fetcher(new Error('boom')), prev);
      expect(data).toEqual(prev);
      expect(report[0]).toMatchObject({ outcome: 'failed', reason: 'boom', stale: false });
      expect(changed).toBe(false);
    });

    it('marks the value stale once it is older than the fetcher allows', async () => {
      const { data, report, changed } = await run(fetcher(new Error('boom')), prevFile('2026-11-12'));
      expect(data.values?.eurRon).toMatchObject({ value: 5.3485, status: 'stale' });
      expect(report[0]).toMatchObject({ outcome: 'failed', stale: true });
      expect(changed).toBe(true);
    });

    it('leaves the key out when there is no previous value', async () => {
      const { data, report, changed } = await run(fetcher(new Error('boom')), {});
      expect(data.values?.eurRon).toBeUndefined();
      expect(report[0].outcome).toBe('missing');
      expect(changed).toBe(false);
    });
  });

  it('clears the stale mark when a fresh value arrives', async () => {
    const prev: AutoDataFile = { values: { eurRon: entry(5.3485, '2026-11-01', 'stale') } };
    const { data } = await run(fetcher({ value: 5.35, asOf: '2026-11-23' }), prev);
    expect(data.values?.eurRon.status).toBe('ok');
  });

  it('rejects an out-of-range value', async () => {
    const { data, report } = await run(fetcher({ value: 53.485, asOf: '2026-11-23' }), prevFile());
    expect(data.values?.eurRon.value).toBe(5.3485);
    expect(report[0].outcome).toBe('rejected');
    expect(data.pending).toBeUndefined();
  });

  it('rejects a value dated before the stored one', async () => {
    const { data, report } = await run(fetcher({ value: 5.30, asOf: '2026-11-19' }), prevFile());
    expect(data.values?.eurRon.value).toBe(5.3485);
    expect(report[0]).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/older/) });
  });

  it('rejects an impossible date', async () => {
    const { report } = await run(fetcher({ value: 5.35, asOf: '2026-13-45' }), prevFile());
    expect(report[0]).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/date/) });
  });

  describe('a jump larger than maxJump', () => {
    const jump = { value: 5.7, asOf: '2026-11-23' };

    it('is held as a candidate instead of being applied', async () => {
      const { data, report, changed } = await run(fetcher(jump), prevFile());
      expect(data.values?.eurRon.value).toBe(5.3485);
      expect(data.pending?.['values.eurRon']).toMatchObject(jump);
      expect(report[0].outcome).toBe('held');
      expect(changed).toBe(true);
    });

    it('is applied when a later run confirms it', async () => {
      const { data: held } = await run(fetcher(jump), prevFile());
      const { data, report } = await run(fetcher({ value: 5.71, asOf: '2026-11-30' }), held, '2026-11-30');
      expect(data.values?.eurRon).toMatchObject({ value: 5.71, asOf: '2026-11-30', status: 'ok' });
      expect(data.pending).toBeUndefined();
      expect(report[0].outcome).toBe('confirmed');
    });

    it('is not confirmed by re-reading the same publication', async () => {
      const { data: held } = await run(fetcher(jump), prevFile());
      const { data, report } = await run(fetcher(jump), held);
      expect(data.values?.eurRon.value).toBe(5.3485);
      expect(report[0].outcome).toBe('held');
    });

    it('replaces the candidate when the next value disagrees with it', async () => {
      const { data: held } = await run(fetcher(jump), prevFile());
      const { data, report } = await run(fetcher({ value: 6.2, asOf: '2026-11-30' }), held, '2026-11-30');
      expect(data.values?.eurRon.value).toBe(5.3485);
      expect(data.pending?.['values.eurRon']).toMatchObject({ value: 6.2, asOf: '2026-11-30' });
      expect(report[0].outcome).toBe('held');
    });
  });

  it('drops a leftover candidate once a normal value is accepted', async () => {
    const prev = prevFile('2026-11-20', { pending: { 'values.eurRon': { value: 5.9, asOf: '2026-11-21' } } });
    const { data } = await run(fetcher({ value: 5.36, asOf: '2026-11-23' }), prev);
    expect(data.pending).toBeUndefined();
  });

  it('does not mutate the previous data', async () => {
    const prev = prevFile('2026-11-01');
    await run(fetcher(new Error('x')), prev);
    expect(prev.values?.eurRon.status).toBe('ok');
  });
});
