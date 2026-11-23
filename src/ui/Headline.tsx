import type { EquivalentRent, Inputs } from '../engine';
import { ro } from '../i18n/ro';
import { formatDuration, formatMoney, type Currency } from './format';

type SaleInputs = Pick<Inputs, 'includeSaleCosts' | 'saleTaxShortPct' | 'saleTaxLongPct' | 'saleTaxShortHoldYears'>;

interface Props {
  eq: EquivalentRent;
  breakEvenMonth: number | null;
  sale: SaleInputs;
  currency: Currency;
  eurRon: number;
}

export function Headline({ eq, breakEvenMonth, sale, currency, eurRon }: Props) {
  const main =
    eq.kind === 'value' ? ro.headlineValue(formatMoney(eq.rent, currency, eurRon))
    : eq.kind === 'alwaysBuy' ? ro.headlineAlwaysBuy
    : ro.headlineAlwaysRent;
  const verdict = breakEvenMonth === null ? ro.verdictRent : ro.verdictBuy(formatDuration(breakEvenMonth));
  // Each month's buyer net worth assumes a sale that month, so a drop in sale tax at the
  // short-hold threshold can be what pushes the buyer ahead. Only worth saying when that drop exists.
  const showSaleTaxNote =
    sale.includeSaleCosts &&
    breakEvenMonth !== null &&
    sale.saleTaxShortPct > sale.saleTaxLongPct &&
    sale.saleTaxShortHoldYears > 0;
  return (
    <header className="headline">
      <h2 data-testid="headline">{main}</h2>
      <p aria-live="polite">{verdict}</p>
      {showSaleTaxNote && <p className="note">{ro.saleTaxNote(formatDuration(sale.saleTaxShortHoldYears * 12))}</p>}
    </header>
  );
}
