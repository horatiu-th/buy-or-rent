import { useId, type ReactNode } from 'react';
import type { DataFile } from '../data/schema';
import { t } from '../i18n';
import { clampSqm, SQM_MIN } from '../state/scenario';
import { NumberInput } from './NumberInput';

interface Props {
  data: DataFile;
  cityId: string;
  sqm: number;
  onChange: (patch: { cityId?: string; sqm?: number }) => void;
  /** Further scenario-wide settings shown on the same row. */
  children?: ReactNode;
}

export function CityPicker({ data, cityId, sqm, onChange, children }: Props) {
  const cityId_ = useId();
  const sqmId = useId();

  return (
    <div className="scenario">
      <div className="scenario-item scenario-city">
        <label htmlFor={cityId_}>{t.city}</label>
        <select id={cityId_} value={cityId} onChange={(e) => onChange({ cityId: e.target.value })}>
          {Object.entries(data.cities).map(([id, c]) => (
            <option key={id} value={id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="scenario-item scenario-sqm">
        <label htmlFor={sqmId}>{t.sqm}</label>
        <div className="number-box">
          <NumberInput
            id={sqmId}
            kind="decimal"
            step={1}
            value={sqm}
            onValue={(n, phase) => {
              // "7" on the way to "70" is below the minimum; it only counts once the field is left.
              if (phase === 'typing' && n < SQM_MIN) return;
              onChange({ sqm: clampSqm(n) });
            }}
          />
          <span className="suffix" aria-hidden="true">m²</span>
        </div>
      </div>
      {children}
    </div>
  );
}
