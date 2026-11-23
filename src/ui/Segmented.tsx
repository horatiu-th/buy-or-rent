import { useId } from 'react';

interface Props<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  hideLegend?: boolean;
}

/** A radio group drawn as a segmented control, so keyboard and screen-reader behaviour stay native. */
export function Segmented<T extends string>({ legend, value, options, onChange, hideLegend }: Props<T>) {
  const name = useId();
  return (
    <fieldset className="segmented">
      <legend className={hideLegend ? 'visually-hidden' : undefined}>{legend}</legend>
      <div className="segmented-track">
        {options.map((o) => (
          <label key={o.value} className="segmented-option">
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
