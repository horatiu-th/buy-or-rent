import { runFetchers } from './runFetchers';
import type { Fetcher } from './types';

const fetcher = (value: number | Error): Fetcher => ({
  path: 'values.ircc', unit: '%', source: 'BNR', sourceUrl: 'https://example', range: { min: 0, max: 0.2 },
  fetch: async () => { if (value instanceof Error) throw value; return { value, asOf: '2026-11-01' }; },
});
const prev = { values: { ircc: { value: 0.055, unit: '%', source: 'BNR', asOf: '2026-08-01', status: 'ok' as const } } };

describe('runFetchers', () => {
  it('writes a valid new value as ok', async () => {
    const { data, report } = await runFetchers([fetcher(0.056)], prev);
    expect(data.values?.ircc).toMatchObject({ value: 0.056, status: 'ok', asOf: '2026-11-01' });
    expect(report[0].outcome).toBe('updated');
  });

  it('keeps the previous value as stale when the fetch throws', async () => {
    const { data, report } = await runFetchers([fetcher(new Error('boom'))], prev);
    expect(data.values?.ircc).toMatchObject({ value: 0.055, status: 'stale' });
    expect(report[0]).toMatchObject({ outcome: 'stale', reason: 'boom' });
  });

  it('keeps the previous value as stale when validation fails', async () => {
    const { data } = await runFetchers([fetcher(0.15)], prev);
    expect(data.values?.ircc).toMatchObject({ value: 0.055, status: 'stale' });
  });

  it('does not mutate the previous data', async () => {
    await runFetchers([fetcher(new Error('x'))], prev);
    expect(prev.values.ircc.status).toBe('ok');
  });
});
