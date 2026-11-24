import { useId } from 'react';
import { SENSITIVITY_STEPS, type Swing, type SwingKey } from '../engine';
import { t } from '../i18n';
import { formatMoney, type Money } from './money';
import { GapCell, GapKey } from './GapCell';

interface Props { grid: number[][]; baseGrowth: number; baseReturn: number; money: Money }

const pct = (x: number) => `${(x * 100).toLocaleString(t.numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const BASE = SENSITIVITY_STEPS.indexOf(0);

export function SensitivityTable({ grid, baseGrowth, baseReturn, money }: Props) {
  const captionId = useId();
  return (
    // Focusable so keyboard users can scroll it sideways when it is wider than a phone screen.
    <div className="table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="sensitivity">
        <caption id={captionId} className="sensitivity-intro">{t.sensitivityHelp}<GapKey /></caption>
        <thead>
          <tr>
            <th scope="col">{t.sensitivityRows} ↓ / {t.sensitivityCols} →</th>
            {SENSITIVITY_STEPS.map((d) => <th scope="col" key={d}>{pct(baseReturn + d)}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              <th scope="row">{pct(baseGrowth + SENSITIVITY_STEPS[i])}</th>
              {row.map((gap, j) => (
                <GapCell key={j} gap={gap} money={money} isBase={i === BASE && j === BASE} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SwingsProps { swings: Swing[]; base: number; money: Money }

const isPctSwing = (key: SwingKey) => key !== 'rent';

/** One assumption at a time moved down and up, for the inputs the grid above leaves fixed. */
export function SwingsTable({ swings, base, money }: SwingsProps) {
  const captionId = useId();
  const setting = (key: SwingKey, v: number) => (isPctSwing(key) ? pct(v) : formatMoney(v, money));
  const cell = (gap: number, label?: string, isBase = false) => (
    <GapCell gap={gap} money={money} setting={label} isBase={isBase} />
  );
  return (
    <div className="table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="sensitivity swings">
        <caption id={captionId} className="sensitivity-intro">{t.swingsHelp}<GapKey /></caption>
        <thead>
          <tr>
            <th scope="col">{t.swingsAssumption}</th>
            <th scope="col">{t.swingsDown}</th>
            <th scope="col">{t.swingsBase}</th>
            <th scope="col">{t.swingsUp}</th>
          </tr>
        </thead>
        <tbody>
          {swings.map((s) => (
            <tr key={s.key}>
              <th scope="row">{t.swingLabels[s.key]}</th>
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
