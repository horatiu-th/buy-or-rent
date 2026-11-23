import type { EquivalentRent, Inputs } from '../engine';
import { ro } from '../i18n/ro';
import { formatDuration, formatMoney, type Currency } from './format';

type SaleInputs = Pick<Inputs, 'includeSaleCosts' | 'saleTaxShortPct' | 'saleTaxLongPct' | 'saleTaxShortHoldYears'>;

interface Props {
  eq: EquivalentRent;
  breakEvenMonth: number | null;
  /** Whether the buyer is level or ahead in any month, which tells a lost lead apart from never leading. */
  buyerEverAhead: boolean;
  sale: SaleInputs;
  currency: Currency;
  eurRon: number;
}

export function Headline({ eq, breakEvenMonth, buyerEverAhead, sale, currency, eurRon }: Props) {
  if (eq.kind === 'invalid') {
    return (
      <header className="headline">
        <h2 data-testid="headline" aria-live="polite">{ro.headlineInvalid}</h2>
      </header>
    );
  }
  const main =
    eq.kind === 'value' ? ro.headlineValue(formatMoney(eq.rent, currency, eurRon))
    : eq.kind === 'alwaysBuy' ? ro.headlineAlwaysBuy
    : ro.headlineAlwaysRent;
  const verdict =
    breakEvenMonth === 0 ? ro.verdictBuyFromStart
    : breakEvenMonth !== null ? ro.verdictBuy(formatDuration(breakEvenMonth))
    : buyerEverAhead ? ro.verdictRentAtEnd
    : ro.verdictRent;
  // Each month's buyer net worth assumes a sale that month, so a drop in sale tax at the
  // short-hold threshold can be what pushes the buyer ahead. Only worth saying when that drop exists.
  const showSaleTaxNote =
    sale.includeSaleCosts &&
    breakEvenMonth !== null &&
    breakEvenMonth > 0 &&
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
