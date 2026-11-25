import { useT, type Messages } from '../i18n';
import { BuyIcon, RentIcon } from './icons';
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

const outcomeText = (t: Messages, outcome: Outcome) =>
  ({ 'buy-wins': t.sensitivityBuyWins, 'rent-wins': t.sensitivityRentWins, tie: t.sensitivityTie })[outcome];

const ICON_PROPS = { size: '1em', strokeWidth: 2.5, 'aria-hidden': true, className: 'outcome-icon' } as const;

/** A tie gets a short dash instead of an icon: nobody wins it. */
function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  if (outcome === 'buy-wins') return <BuyIcon {...ICON_PROPS} />;
  if (outcome === 'rent-wins') return <RentIcon {...ICON_PROPS} />;
  return <span className="tie-mark" aria-hidden="true" />;
}

/**
 * One table cell for "who comes out ahead, and by how much". The amount is unsigned and takes the
 * winner's colour, led by an icon that also differs (a house for buying, a key for renting), so the
 * cell reads without colour. Screen readers hear the winner in words.
 */
export function GapCell({ gap, money, setting, isBase = false }: Props) {
  const t = useT();
  const outcome = outcomeOf(gap, money);
  return (
    <td className={`gap-cell ${outcome}${isBase ? ' is-base' : ''}`}>
      {setting && <span className="swing-setting">{setting}</span>}
      <span className="gap-amount">
        <OutcomeIcon outcome={outcome} />
        {formatMoney(Math.abs(gap), money)}
      </span>
      <span className="visually-hidden">
        {' '}({outcomeText(t, outcome)}{isBase && `, ${t.sensitivityBase}`})
      </span>
    </td>
  );
}

/** Explains the two icons, once per table under its caption. */
export function GapKey() {
  const t = useT();
  return (
    <span className="gap-key" aria-hidden="true">
      <span className="buy-wins"><OutcomeIcon outcome="buy-wins" />{t.sensitivityBuyWins}</span>
      <span className="rent-wins"><OutcomeIcon outcome="rent-wins" />{t.sensitivityRentWins}</span>
    </span>
  );
}
