import { useId } from 'react';
import { SENSITIVITY_STEPS, type Swing, type SwingKey } from '../engine';
import { ro } from '../i18n/ro';
import { formatMoney, type Currency } from './format';

interface Props { grid: number[][]; baseGrowth: number; baseReturn: number; currency: Currency; eurRon: number }

const pct = (x: number) => `${(x * 100).toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const BASE = SENSITIVITY_STEPS.indexOf(0);

export function SensitivityTable({ grid, baseGrowth, baseReturn, currency, eurRon }: Props) {
  const captionId = useId();
  return (
    // Focusable so keyboard users can scroll it sideways when it is wider than a phone screen.
    <div className="table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="sensitivity">
        <caption id={captionId} className="sensitivity-intro">{ro.sensitivityHelp}</caption>
        <thead>
          <tr>
            <th scope="col">{ro.sensitivityRows} ↓ / {ro.sensitivityCols} →</th>
            {SENSITIVITY_STEPS.map((d) => <th scope="col" key={d}>{pct(baseReturn + d)}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              <th scope="row">{pct(baseGrowth + SENSITIVITY_STEPS[i])}</th>
              {row.map((gap, j) => {
                const buyWins = gap >= 0;
                const isBase = i === BASE && j === BASE;
                return (
                  <td key={j} className={`${buyWins ? 'buy-wins' : 'rent-wins'}${isBase ? ' is-base' : ''}`}>
                    {/* The sign says who wins for those who can't tell the side bar's colour. */}
                    {gap > 0 && '+'}{formatMoney(gap, currency, eurRon)}
                    <span className="visually-hidden">
                      {' '}({buyWins ? ro.sensitivityBuyWins : ro.sensitivityRentWins}{isBase && `, ${ro.sensitivityBase}`})
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SwingsProps { swings: Swing[]; base: number; currency: Currency; eurRon: number }

const isPctSwing = (key: SwingKey) => key !== 'rent';

/** One assumption at a time moved down and up, for the inputs the grid above leaves fixed. */
export function SwingsTable({ swings, base, currency, eurRon }: SwingsProps) {
  const captionId = useId();
  const money = (v: number) => formatMoney(v, currency, eurRon);
  const setting = (key: SwingKey, v: number) => (isPctSwing(key) ? pct(v) : money(v));
  const cell = (gap: number, label?: string, isBase = false) => {
    const buyWins = gap >= 0;
    return (
      <td className={`${buyWins ? 'buy-wins' : 'rent-wins'}${isBase ? ' is-base' : ''}`}>
        {label && <span className="swing-setting">{label}: </span>}
        {gap > 0 && '+'}{money(gap)}
        <span className="visually-hidden">
          {' '}({buyWins ? ro.sensitivityBuyWins : ro.sensitivityRentWins}{isBase && `, ${ro.sensitivityBase}`})
        </span>
      </td>
    );
  };
  return (
    <div className="table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="sensitivity swings">
        <caption id={captionId} className="sensitivity-intro">{ro.swingsHelp}</caption>
        <thead>
          <tr>
            <th scope="col">{ro.swingsAssumption}</th>
            <th scope="col">{ro.swingsDown}</th>
            <th scope="col">{ro.swingsBase}</th>
            <th scope="col">{ro.swingsUp}</th>
          </tr>
        </thead>
        <tbody>
          {swings.map((s) => (
            <tr key={s.key}>
              <th scope="row">{ro.swingLabels[s.key]}</th>
              {cell(s.down.gap, setting(s.key, s.down.value))}
              {cell(base, undefined, true)}
              {cell(s.up.gap, setting(s.key, s.up.value))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
