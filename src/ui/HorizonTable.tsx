import { useId } from 'react';
import type { HorizonResult } from '../engine';
import { t } from '../i18n';
import { formatMoney, type Money } from './money';
import { GapCell, GapKey } from './GapCell';

interface Props {
  rows: HorizonResult[];
  chosenYears: number;
  real: boolean;
  money: Money;
}

const h = t.horizons;

/** The verdict at several holding periods, so the chosen horizon isn't the only answer on the page. */
export function HorizonTable({ rows, chosenYears, real, money }: Props) {
  const captionId = useId();
  const fmt = (lei: number) => formatMoney(lei, money);
  const shown = (r: HorizonResult) => (real ? r.gap / r.deflator : r.gap);
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
            const gap = shown(r);
            const isChosen = r.years === chosenYears;
            const threshold =
              r.eq.kind === 'value' ? fmt(r.eq.rent)
              : r.eq.kind === 'alwaysBuy' ? h.alwaysBuy
              : r.eq.kind === 'alwaysRent' ? h.alwaysRent
              : h.none;
            return (
              <tr key={r.years} className={isChosen ? 'is-base' : undefined}>
                <th scope="row">
                  {t.count(r.years, 'year')}
                  {isChosen && <span className="horizon-yours"> ({h.yours})</span>}
                </th>
                <td>{threshold}</td>
                <GapCell gap={gap} money={money} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
