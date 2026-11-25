import { useId } from 'react';
import type { EquivalentRent, HorizonResult } from '../engine';
import { useT, type Messages } from '../i18n';
import { formatMoney, inView, type Money } from './money';
import { GapCell, GapKey } from './GapCell';

interface Props {
  rows: HorizonResult[];
  chosenYears: number;
  real: boolean;
  money: Money;
}

function thresholdText(eq: EquivalentRent, money: Money, h: Messages['horizons']): string {
  switch (eq.kind) {
    case 'value': return formatMoney(eq.rent, money);
    case 'alwaysBuy': return h.alwaysBuy;
    case 'alwaysRent': return h.alwaysRent;
    case 'noThreshold':
    case 'invalid': return h.none;
  }
}

/** The verdict at several holding periods, so the chosen horizon isn't the only answer on the page. */
export function HorizonTable({ rows, chosenYears, real, money }: Props) {
  const t = useT();
  const h = t.horizons;
  const captionId = useId();
  return (
    <div className="table-scroll horizons" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="sensitivity">
        <caption id={captionId} className="sensitivity-intro">
          <strong>{h.title}.</strong> {h.help}
          <GapKey />
        </caption>
        <thead>
          <tr>
            <th scope="col">{h.after}</th>
            <th scope="col">{h.threshold}</th>
            <th scope="col">{h.gap(real)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isChosen = r.years === chosenYears;
            return (
              <tr key={r.years} className={isChosen ? 'is-base' : undefined}>
                <th scope="row">
                  {t.count(r.years, 'year')}
                  {isChosen && <span className="horizon-yours"> ({h.yours})</span>}
                </th>
                <td>{thresholdText(r.eq, money, h)}</td>
                <GapCell gap={inView(r.gap, r.deflator, { real })} money={money} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
