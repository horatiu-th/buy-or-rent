// A generic client name and a hard timeout, so a hung source fails one fetcher instead of stalling the run.
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'buy-or-rent-data-pipeline' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}
