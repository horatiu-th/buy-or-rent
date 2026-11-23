import { useEffect, useId, useState } from 'react';
import type { DataFile } from '../data/schema';
import type { PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';
import { SQM_MAX, SQM_MIN } from '../state/scenario';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  onChange: (patch: { cityId?: string; propertyType?: PropertyType; sqm?: number }) => void;
}

export function CityPicker({ data, cityId, propertyType, sqm, onChange }: Props) {
  const radioName = useId();
  const [draft, setDraft] = useState(String(sqm));
  const [focused, setFocused] = useState(false);

  // Same draft-while-focused pattern as InputField: the field can be emptied and retyped,
  // and partial values like "7" on the way to "70" never reach the simulation.
  useEffect(() => {
    if (!focused) setDraft(String(sqm));
  }, [sqm, focused]);

  return (
    <div className="city-picker">
      <label>
        {ro.city}
        <select value={cityId} onChange={(e) => onChange({ cityId: e.target.value })}>
          {Object.entries(data.cities).map(([id, c]) => (
            <option key={id} value={id}>{c.name}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{ro.propertyType}</legend>
        <label><input type="radio" name={radioName} checked={propertyType === 'new'} onChange={() => onChange({ propertyType: 'new' })} /> {ro.newBuild}</label>
        <label><input type="radio" name={radioName} checked={propertyType === 'existing'} onChange={() => onChange({ propertyType: 'existing' })} /> {ro.existing}</label>
      </fieldset>
      <label>
        {ro.sqm}
        <input
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
      </label>
    </div>
  );
}
