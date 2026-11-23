import { useEffect, useId, useState } from 'react';
import type { DataFile } from '../data/schema';
import type { PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';
import { SQM_MAX, SQM_MIN } from '../state/scenario';
import { Segmented } from './Segmented';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  onChange: (patch: { cityId?: string; propertyType?: PropertyType; sqm?: number }) => void;
}

const TYPES = [
  { value: 'new', label: ro.newBuild },
  { value: 'existing', label: ro.existing },
] as const;

export function CityPicker({ data, cityId, propertyType, sqm, onChange }: Props) {
  const cityId_ = useId();
  const sqmId = useId();
  const [draft, setDraft] = useState(String(sqm));
  const [focused, setFocused] = useState(false);

  // Same draft-while-focused pattern as InputField: the field can be emptied and retyped,
  // and partial values like "7" on the way to "70" never reach the simulation.
  useEffect(() => {
    if (!focused) setDraft(String(sqm));
  }, [sqm, focused]);

  return (
    <div className="scenario">
      <div className="scenario-item scenario-city">
        <label htmlFor={cityId_}>{ro.city}</label>
        <select id={cityId_} value={cityId} onChange={(e) => onChange({ cityId: e.target.value })}>
          {Object.entries(data.cities).map(([id, c]) => (
            <option key={id} value={id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="scenario-item">
        <Segmented
          legend={ro.propertyType}
          value={propertyType}
          options={TYPES}
          onChange={(v) => onChange({ propertyType: v })}
        />
      </div>
      <div className="scenario-item scenario-sqm">
        <label htmlFor={sqmId}>{ro.sqm}</label>
        <div className="number-box">
          <input
            id={sqmId}
            type="number"
            inputMode="decimal"
            min={SQM_MIN}
            max={SQM_MAX}
            value={draft}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isFinite(n) && n >= SQM_MIN) onChange({ sqm: n });
            }}
          />
          <span className="suffix" aria-hidden="true">m²</span>
        </div>
      </div>
    </div>
  );
}
