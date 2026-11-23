import { readFileSync } from 'node:fs';
import { parseBnrFx } from './bnrFx';

it('extracts the EUR rate and date from the BNR feed', () => {
  const xml = readFileSync('pipeline/fixtures/bnr-fx.xml', 'utf8');
  expect(parseBnrFx(xml)).toEqual({ value: 5.3485, asOf: '2026-11-23' });
});

it('throws on unexpected content', () => {
  expect(() => parseBnrFx('<html>maintenance</html>')).toThrow();
});
