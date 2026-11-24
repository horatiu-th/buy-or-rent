import { useId, type ReactNode } from 'react';
import type { DataFile } from '../data/schema';
import { t } from '../i18n';
import { clampSqm, SQM_MIN, type Scenario } from '../state/scenario';
import { NumberInput } from './NumberInput';

interface Props {
  data: DataFile;
  cityId: string;
  sqm: number;
  onChange: (patch: Partial<Pick<Scenario, 'cityId' | 'sqm'>>) => void;
  /** Further scenario-wide settings shown on the same row. */
  children?: ReactNode;
}

export function CityPicker({ data, cityId, sqm, onChange, children }: Props) {
  const selectId = useId();
  const sqmId = useId();

  return (
    <div className="scenario">
      <div className="scenario-item scenario-city">
        <label htmlFor={selectId}>{t.city}</label>
        <select id={selectId} value={cityId} onChange={(e) => onChange({ cityId: e.target.value })}>
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
            min={SQM_MIN}
            value={sqm}
            onValue={(n) => onChange({ sqm: clampSqm(n) })}
          />
          <span className="suffix" aria-hidden="true">m²</span>
        </div>
      </div>
      {children}
    </div>
  );
}
