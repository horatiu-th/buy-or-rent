import { daysBetween, isIsoDate } from './dates';

describe('isIsoDate', () => {
  it.each(['2026-11-23', '2028-02-29'])('accepts %s', (d) => expect(isIsoDate(d)).toBe(true));
  it.each(['2026-13-45', '2026-02-30', '2027-02-29', '2026-1-5', '2026-11-23T00:00', '', 20261123])(
    'rejects %s', (d) => expect(isIsoDate(d)).toBe(false));
});

it('counts whole days between two dates', () => {
  expect(daysBetween('2026-11-20', '2026-11-23')).toBe(3);
  expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
});
