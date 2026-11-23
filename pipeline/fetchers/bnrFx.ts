import { fetchText } from '../http';
import type { Fetcher } from '../types';

export function parseBnrFx(xml: string) {
  const date = xml.match(/<Cube date="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const rate = xml.match(/<Rate currency="EUR">([\d.]+)<\/Rate>/)?.[1];
  if (!date || !rate) throw new Error('BNR FX feed: EUR rate or date not found');
  return { value: Number(rate), asOf: date };
}

// The www.bnr.ro address redirects to the home page; the feed is served from curs.bnr.ro.
const URL = 'https://curs.bnr.ro/nbrfxrates.xml';

export const bnrFx: Fetcher = {
  path: 'values.eurRon',
  unit: 'lei/€',
  source: 'BNR, curs de referință',
  sourceUrl: URL,
  range: { min: 3, max: 10 },
  fetch: async () => parseBnrFx(await fetchText(URL)),
};
