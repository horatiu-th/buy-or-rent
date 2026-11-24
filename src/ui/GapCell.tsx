import { t } from '../i18n';
import { formatMoney, roundsToZero, type Money } from './money';

interface Props {
  /** Buyer net worth minus renter net worth, in lei. */
  gap: number;
  money: Money;
  /** The assumption value this cell was computed at, shown above the amount. */
  setting?: string;
  isBase?: boolean;
}

type Outcome = 'buy-wins' | 'rent-wins' | 'tie';

/** A gap that prints as zero is a tie: naming a winner for "0 lei" would contradict the number. */
const outcomeOf = (gap: number, money: Money): Outcome =>
  roundsToZero(gap, money) ? 'tie' : gap > 0 ? 'buy-wins' : 'rent-wins';

const OUTCOME_TEXT = {
  'buy-wins': t.sensitivityBuyWins,
  'rent-wins': t.sensitivityRentWins,
  tie: t.sensitivityTie,
} satisfies Record<Outcome, string>;

/**
 * One table cell for "who comes out ahead, and by how much". The amount is unsigned and takes the
 * winner's colour, led by a marker whose shape also differs (a circle for buying, a diamond for
 * renting), so the cell reads without colour. Screen readers hear the winner in words.
 */
export function GapCell({ gap, money, setting, isBase = false }: Props) {
  const outcome = outcomeOf(gap, money);
  return (
    <td className={`gap-cell ${outcome}${isBase ? ' is-base' : ''}`}>
      {setting && <span className="swing-setting">{setting}</span>}
      <span className="gap-amount">{formatMoney(Math.abs(gap), money)}</span>
      <span className="visually-hidden">
        {' '}({OUTCOME_TEXT[outcome]}{isBase && `, ${t.sensitivityBase}`})
      </span>
    </td>
  );
}

/** Explains the two markers, once per table under its caption. */
export function GapKey() {
  return (
    <span className="gap-key" aria-hidden="true">
      <span className="buy-wins">{t.sensitivityBuyWins}</span>
      <span className="rent-wins">{t.sensitivityRentWins}</span>
    </span>
  );
}
