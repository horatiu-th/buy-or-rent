import type { DataFile } from '../data/schema';
import type { PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  onChange: (patch: { cityId?: string; propertyType?: PropertyType; sqm?: number }) => void;
}

export function CityPicker({ data, cityId, propertyType, sqm, onChange }: Props) {
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
        <label><input type="radio" checked={propertyType === 'new'} onChange={() => onChange({ propertyType: 'new' })} /> {ro.newBuild}</label>
        <label><input type="radio" checked={propertyType === 'existing'} onChange={() => onChange({ propertyType: 'existing' })} /> {ro.existing}</label>
      </fieldset>
      <label>
        {ro.sqm}
        <input type="number" min={10} max={500} value={sqm} onChange={(e) => {
          const n = Number(e.target.value);
          if (n > 0) onChange({ sqm: n });
        }} />
      </label>
    </div>
  );
}
