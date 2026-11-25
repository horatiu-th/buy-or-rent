import type { DataFile } from '../data/schema';
import { numberFormat } from '../i18n/numberFormat';

export interface CurrencyDef {
  /** Printed after amounts and inside money inputs. */
  symbol: string;
  /** How many lei one unit is worth today. The engine works in lei; other currencies are a display choice. */
  perUnit: (data: DataFile) => number;
}

/**
 * Every currency the page can show, keyed by the id used in links (?moneda=EUR). To add one, add an
 * entry whose rate comes from the data file; the switch, inputs, charts and tables pick it up.
 */
export const CURRENCIES = {
  RON: { symbol: 'lei', perUnit: () => 1 },
  EUR: { symbol: '€', perUnit: (data) => data.values.eurRon.value },
} as const satisfies Record<string, CurrencyDef>;

export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_IDS = Object.keys(CURRENCIES) as Currency[];
/** The engine's currency: amounts in it need no conversion. */
export const BASE_CURRENCY: Currency = 'RON';

export const isCurrency = (v: unknown): v is Currency => typeof v === 'string' && Object.hasOwn(CURRENCIES, v);

/** A currency ready for display: what to print, today's rate and the number format to print it in. */
export interface Money {
  currency: Currency;
  symbol: string;
  /** Lei per unit. */
  perUnit: number;
  isBase: boolean;
  /** BCP 47 tag of the page language, which decides the thousands and decimal separators. */
  numberLocale: string;
}

export function moneyFor(currency: Currency, data: DataFile, numberLocale: string): Money {
  const def = CURRENCIES[currency];
  return { currency, symbol: def.symbol, perUnit: def.perUnit(data), isBase: currency === BASE_CURRENCY, numberLocale };
}

export const toUnits = (lei: number, money: Money) => lei / money.perUnit;
export const fromUnits = (units: number, money: Money) => units * money.perUnit;

/** How results are shown: in which currency, and whether in today's money or nominal. */
export interface View { money: Money; real: boolean }

/** A nominal amount in lei as the view shows it: deflated to today's money when asked, still in lei. */
export const inView = (nominal: number, deflator: number, view: Pick<View, 'real'>) =>
  view.real ? nominal / deflator : nominal;

/** Whole units of the chosen currency, e.g. "1.234 lei" or "250 €". */
export function formatMoney(lei: number, money: Money): string {
  const fmt = numberFormat(money.numberLocale, { maximumFractionDigits: 0 });
  // `|| 0` turns the -0 that Math.round gives for small negatives into 0, so it never prints "-0".
  return `${fmt.format(Math.round(toUnits(lei, money)) || 0)} ${money.symbol}`;
}

/** True when an amount prints as zero, so it can be shown as a tie rather than a win. */
export const roundsToZero = (lei: number, money: Money) => Math.round(toUnits(lei, money)) === 0;
