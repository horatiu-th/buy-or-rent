import { readFileSync } from 'node:fs';
import { bnrFx, parseBnrFx } from './bnrFx';
import { check } from '../validate';

const xml = readFileSync('pipeline/fixtures/bnr-fx.xml', 'utf8');
const withRate = (rate: string) => xml.replace('<Rate currency="EUR">5.3485</Rate>', rate);

it('extracts the EUR rate and date from the BNR feed', () => {
  expect(parseBnrFx(xml)).toEqual({ value: 5.3485, asOf: '2026-11-23' });
});

it('throws on unexpected content', () => {
  expect(() => parseBnrFx('<html>maintenance</html>')).toThrow();
});

it('rejects an impossible date', () => {
  expect(() => parseBnrFx(xml.replace('<Cube date="2026-11-23"', '<Cube date="2026-13-45"'))).toThrow(/date/);
});

it.each(['5.', '.5', '5.34.85', '5,3485', ''])('rejects the malformed rate "%s"', (rate) => {
  expect(() => parseBnrFx(withRate(`<Rate currency="EUR">${rate}</Rate>`))).toThrow(/rate/);
});

it('rejects a rate quoted per multiple units, which would be off by that factor', () => {
  expect(() => parseBnrFx(withRate('<Rate currency="EUR" multiplier="100">534.85</Rate>'))).toThrow(/multiplier/);
});

describe('plausibility limits', () => {
  it('reject a jump that a 30% limit would have let through', () => {
    expect(check(4.0, bnrFx.range, 5.3485, bnrFx.maxJump).ok).toBe(false);
  });
  it('accept an ordinary daily move', () => {
    expect(check(5.37, bnrFx.range, 5.3485, bnrFx.maxJump).ok).toBe(true);
  });
  it('reject values outside the plausible band', () => {
    expect(check(4.4, bnrFx.range).ok).toBe(false);
    expect(check(6.6, bnrFx.range).ok).toBe(false);
  });
});
