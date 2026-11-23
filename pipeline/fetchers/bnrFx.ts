import { isIsoDate } from '../dates';
import { fetchText } from '../http';
import type { Fetcher } from '../types';

export function parseBnrFx(xml: string) {
  const date = xml.match(/<Cube date="([^"]*)"/)?.[1];
  const rate = xml.match(/<Rate currency="EUR"([^>]*)>([^<]*)<\/Rate>/);
  if (date === undefined || !rate) throw new Error('BNR FX feed: EUR rate or date not found');
  if (!isIsoDate(date)) throw new Error(`BNR FX feed: invalid date ${JSON.stringify(date)}`);
  // Some currencies are quoted per 100 units; EUR never has been, so a multiplier means the format changed.
  if (/multiplier=/.test(rate[1])) throw new Error(`BNR FX feed: unexpected multiplier on the EUR rate (${rate[1].trim()})`);
  if (!/^\d+\.\d+$/.test(rate[2])) throw new Error(`BNR FX feed: malformed EUR rate ${JSON.stringify(rate[2])}`);
  return { value: Number(rate[2]), asOf: date };
}

// The www.bnr.ro address redirects to the home page; the feed is served from curs.bnr.ro.
const URL = 'https://curs.bnr.ro/nbrfxrates.xml';

export const bnrFx: Fetcher = {
  path: 'values.eurRon',
  unit: 'lei/€',
  source: 'BNR, curs de referință',
  sourceUrl: URL,
  range: { min: 4.5, max: 6.5 },
  // Between two weekly runs, a step this large is more likely a feed error than a market move,
  // so it is held until a later publication confirms it.
  maxJump: 0.05,
  // A business-day series: ten days spans a long holiday weekend without false alarms.
  maxAgeDays: 10,
  fetch: async () => parseBnrFx(await fetchText(URL)),
};
