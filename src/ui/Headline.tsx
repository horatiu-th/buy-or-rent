import type { EquivalentRent } from '../engine';
import { ro } from '../i18n/ro';
import { formatDuration, formatMoney, type Currency } from './format';

interface Props {
  eq: EquivalentRent;
  breakEvenMonth: number | null;
  includeSaleCosts: boolean;
  saleTaxShortHoldYears: number;
  currency: Currency;
  eurRon: number;
}

export function Headline({ eq, breakEvenMonth, includeSaleCosts, saleTaxShortHoldYears, currency, eurRon }: Props) {
  const main =
    eq.kind === 'value' ? ro.headlineValue(formatMoney(eq.rent, currency, eurRon))
    : eq.kind === 'alwaysBuy' ? ro.headlineAlwaysBuy
    : ro.headlineAlwaysRent;
  const verdict = breakEvenMonth === null ? ro.verdictRent : ro.verdictBuy(formatDuration(breakEvenMonth));
  // Each month's buyer net worth assumes a sale that month, so the drop in sale tax at the
  // short-hold threshold can be what pushes the buyer ahead; say so wherever a break-even is shown.
  const showSaleTaxNote = includeSaleCosts && breakEvenMonth !== null;
  return (
    <header className="headline" aria-live="polite">
      <h2 data-testid="headline">{main}</h2>
      <p>{verdict}</p>
      {showSaleTaxNote && <p className="note">{ro.saleTaxNote(saleTaxShortHoldYears)}</p>}
    </header>
  );
}
