import type { Money } from '../ui/money';

/** Display currencies for tests, with round rates so expected amounts are easy to read. */
export const LEI: Money = { currency: 'RON', symbol: 'lei', perUnit: 1, isBase: true };
export const euro = (perUnit: number): Money => ({ currency: 'EUR', symbol: '€', perUnit, isBase: false });
