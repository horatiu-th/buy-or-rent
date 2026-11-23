import { SENSITIVITY_STEPS } from '../engine';
import { ro } from '../i18n/ro';
import { formatMoney, type Currency } from './format';

interface Props { grid: number[][]; baseGrowth: number; baseReturn: number; currency: Currency; eurRon: number }

const pct = (x: number) => `${(x * 100).toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function SensitivityTable({ grid, baseGrowth, baseReturn, currency, eurRon }: Props) {
  return (
    <div>
      <p className="sensitivity-intro">{ro.sensitivityHelp}</p>
      <table className="sensitivity">
        <thead>
          <tr>
            <th>{ro.sensitivityRows} ↓ / {ro.sensitivityCols} →</th>
            {SENSITIVITY_STEPS.map((d) => <th key={d}>{pct(baseReturn + d)}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              <th>{pct(baseGrowth + SENSITIVITY_STEPS[i])}</th>
              {row.map((gap, j) => (
                <td key={j} className={gap >= 0 ? 'buy-wins' : 'rent-wins'}>{formatMoney(gap, currency, eurRon)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
