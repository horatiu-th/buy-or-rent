import { useId, type CSSProperties } from 'react';
import type { EquivalentRent } from '../engine';
import { ro } from '../i18n/ro';
import { formatMoney, type Currency } from './format';

interface Props {
  eq: EquivalentRent;
  rent: number;
  price: number;
  currency: Currency;
  eurRon: number;
  onRentChange: (lei: number) => void;
}

const STEP = 50;

/** Rounds up to a tidy scale end so the axis doesn't end on an odd number. */
function niceCeil(x: number) {
  const unit = x > 10_000 ? 1_000 : 500;
  return Math.max(unit, Math.ceil(x / unit) * unit);
}

/**
 * Where the user's rent sits relative to the rent at which buying and renting end level.
 * The scale end depends only on the threshold (which doesn't depend on the rent itself),
 * so dragging the marker never rescales the bar under the pointer.
 */
export function RentScale({ eq, rent, price, currency, eurRon, onRentChange }: Props) {
  const id = useId();
  const max = niceCeil(eq.kind === 'value' ? eq.rent * 2 : price * 0.01);
  const threshold = eq.kind === 'value' ? eq.rent / max : eq.kind === 'alwaysBuy' ? 0 : 1;
  const marker = Math.min(rent, max) / max;
  const fmt = (v: number) => formatMoney(v, currency, eurRon);
  const buyerWins = eq.kind === 'alwaysBuy' || (eq.kind === 'value' && rent > eq.rent);

  // Labels near either end anchor to that end instead of centring, so they never spill off the bar.
  const anchor = (p: number) => (p < 0.2 ? '0%' : p > 0.8 ? '-100%' : '-50%');
  const style = {
    '--t': `${threshold * 100}%`,
    '--m': `${marker * 100}%`,
    '--m-shift': anchor(marker),
    '--t-shift': anchor(threshold),
  } as CSSProperties;

  return (
    <div className={`rent-scale ${buyerWins ? 'buyer-wins' : 'renter-wins'}`} style={style}>
      <div className="rent-scale-marks" aria-hidden="true">
        <span className="rent-scale-you">
          {ro.scale.yourRent}: {fmt(rent)}
        </span>
      </div>
      <div className="rent-scale-track">
        {eq.kind === 'value' && <span className="rent-scale-threshold" aria-hidden="true" />}
        <input
          id={id}
          type="range"
          min={0}
          max={max}
          step={STEP}
          value={Math.min(rent, max)}
          aria-label={ro.scale.label}
          aria-valuetext={fmt(rent)}
          onChange={(e) => onRentChange(Number(e.target.value))}
        />
      </div>
      <div className="rent-scale-legend" aria-hidden="true">
        <span className="rent-scale-side rent-side">{ro.scale.rentWins}</span>
        {eq.kind === 'value' && (
          <span className="rent-scale-threshold-label">
            {ro.scale.threshold} {fmt(eq.rent)}
          </span>
        )}
        <span className="rent-scale-side buy-side">{ro.scale.buyWins}</span>
      </div>
    </div>
  );
}
