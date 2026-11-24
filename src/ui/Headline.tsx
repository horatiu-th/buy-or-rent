import type { EquivalentRent, Inputs } from '../engine';
import { t } from '../i18n';
import { formatMoney, type Money } from './money';

type SaleInputs = Pick<Inputs, 'includeSaleCosts' | 'saleTaxShortPct' | 'saleTaxLongPct' | 'saleTaxShortHoldYears'>;

interface Props {
  eq: EquivalentRent;
  horizonMonths: number;
  breakEvenMonth: number | null;
  /** Whether the buyer is level or ahead in any month, which tells a lost lead apart from never leading. */
  buyerEverAhead: boolean;
  sale: SaleInputs;
  money: Money;
}

export function Headline({ eq, horizonMonths, breakEvenMonth, buyerEverAhead, sale, money }: Props) {
  if (eq.kind === 'invalid') {
    return (
      <header className="headline">
        <h2 data-testid="headline" aria-live="polite">{t.headlineInvalid}</h2>
      </header>
    );
  }
  const after = t.duration(horizonMonths);
  const main =
    eq.kind === 'value' ? t.headlineValue(after, formatMoney(eq.rent, money))
    : eq.kind === 'alwaysBuy' ? t.headlineAlwaysBuy(after)
    : eq.kind === 'noThreshold' ? t.headlineNoThreshold(after)
    : t.headlineAlwaysRent(after);
  const verdict =
    breakEvenMonth === 0 ? t.verdictBuyFromStart
    : breakEvenMonth !== null ? t.verdictBuy(t.duration(breakEvenMonth))
    : buyerEverAhead ? t.verdictRentAtEnd
    : t.verdictRent;
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
      {showSaleTaxNote && <p className="note">{t.saleTaxNote(t.duration(sale.saleTaxShortHoldYears * 12))}</p>}
    </header>
  );
}
