import { useId } from 'react';
import type { HorizonResult } from '../engine';
import { ro } from '../i18n/ro';
import { countOf, formatMoney, type Currency } from './format';

interface Props {
  rows: HorizonResult[];
  chosenYears: number;
  real: boolean;
  currency: Currency;
  eurRon: number;
}

const t = ro.horizons;

/** The verdict at several holding periods, so the chosen horizon isn't the only answer on the page. */
export function HorizonTable({ rows, chosenYears, real, currency, eurRon }: Props) {
  const captionId = useId();
  const fmt = (lei: number) => formatMoney(lei, currency, eurRon);
  return (
    <div className="table-scroll horizons" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="sensitivity">
        <caption id={captionId} className="sensitivity-intro">
          <strong>{t.title}.</strong> {t.help}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t.after}</th>
            <th scope="col">{t.threshold}</th>
            <th scope="col">{t.gap(real)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const gap = real ? r.gap / r.deflator : r.gap;
            const isChosen = r.years === chosenYears;
            const threshold =
              r.eq.kind === 'value' ? fmt(r.eq.rent)
              : r.eq.kind === 'alwaysBuy' ? t.alwaysBuy
              : r.eq.kind === 'alwaysRent' ? t.alwaysRent
              : t.none;
            return (
              <tr key={r.years} className={isChosen ? 'is-base' : undefined}>
                <th scope="row">
                  {countOf(r.years, 'an', 'ani')}
                  {isChosen && <span className="horizon-yours"> ({t.yours})</span>}
                </th>
                <td>{threshold}</td>
                <td className={gap >= 0 ? 'buy-wins' : 'rent-wins'}>
                  {gap > 0 && '+'}{fmt(gap)}
                  <span className="visually-hidden"> ({gap >= 0 ? ro.sensitivityBuyWins : ro.sensitivityRentWins})</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
