import { useState, type CSSProperties } from 'react';
import type { EquivalentRent } from '../engine';
import { useT } from '../i18n';
import { fieldDef } from './fields';
import { formatMoney, type Money } from './money';

interface Props {
  eq: EquivalentRent;
  rent: number;
  price: number;
  money: Money;
  onRentChange: (lei: number) => void;
}

/** The slider moves in the same steps as the rent field's arrow keys. */
const STEP = fieldDef('rent').step;

/** Rounds up to a tidy scale end so the axis doesn't end on an odd number. */
function niceCeil(x: number) {
  const unit = x > 10_000 ? 1_000 : 500;
  return Math.max(unit, Math.ceil(x / unit) * unit);
}

/**
 * Where the user's rent sits relative to the rent at which buying and renting end level.
 * The scale ends at twice that threshold, or further out when a typed rent is higher, so the
 * slider never snaps the rent down. While the slider is in use the end is held, so dragging
 * never rescales the bar under the pointer.
 */
export function RentScale({ eq, rent, price, money, onRentChange }: Props) {
  const t = useT();
  const [heldMax, setHeldMax] = useState<number | null>(null);
  const baseMax = niceCeil(eq.kind === 'value' ? eq.rent * 2 : price * 0.01);
  const max = Math.max(heldMax ?? 0, rent > baseMax ? niceCeil(rent) : baseMax);
  const threshold = eq.kind === 'value' ? eq.rent / max : eq.kind === 'alwaysBuy' ? 0 : 1;
  const split = eq.kind === 'value';
  const marker = Math.min(rent, max) / max;
  const fmt = (v: number) => formatMoney(v, money);
  const verdict =
    eq.kind === 'invalid' || eq.kind === 'noThreshold' ? ''
    : eq.kind === 'alwaysBuy' || (eq.kind === 'value' && rent > eq.rent) ? 'buyer-wins'
    : 'renter-wins';

  // Labels near either end anchor to that end instead of centring, so they never spill off the bar.
  const anchor = (p: number) => (p < 0.2 ? '0%' : p > 0.8 ? '-100%' : '-50%');
  const style = {
    '--t': `${threshold * 100}%`,
    '--m': `${marker * 100}%`,
    '--m-shift': anchor(marker),
    '--t-shift': anchor(threshold),
  } as CSSProperties;

  return (
    <div className={`rent-scale ${verdict}`.trim()} data-outcome={eq.kind} style={style}>
      <div className="rent-scale-marks" aria-hidden="true">
        <span className="rent-scale-you">
          {t.scale.yourRent}: {fmt(rent)}
        </span>
      </div>
      <div className="rent-scale-track">
        {split && <span className="rent-scale-threshold" aria-hidden="true" />}
        <input
          type="range"
          min={0}
          max={max}
          step={STEP}
          value={Math.min(rent, max)}
          aria-label={t.scale.label}
          aria-valuetext={fmt(rent)}
          onFocus={() => setHeldMax(max)}
          onBlur={() => setHeldMax(null)}
          onChange={(e) => onRentChange(Number(e.target.value))}
        />
      </div>
      <div className="rent-scale-legend" aria-hidden="true">
        {(split || eq.kind === 'alwaysRent') && <span className="rent-scale-side rent-side">{t.scale.rentWins}</span>}
        {eq.kind === 'value' && (
          <span className="rent-scale-threshold-label">
            {t.scale.threshold} {fmt(eq.rent)}
          </span>
        )}
        {(split || eq.kind === 'alwaysBuy') && <span className="rent-scale-side buy-side">{t.scale.buyWins}</span>}
      </div>
    </div>
  );
}
