import { render, screen } from '@testing-library/react';
import { simulate, type Result } from '../engine';
import { baseInputs } from '../engine/fixtures';
import {
  axisShort, BreakdownChart, breakEvenX, chartRows, MonthlyCostsChart, NetWorthChart, niceTicks, yearTicks,
} from './charts';
import type { View } from './money';
import { LEI, euro } from '../test/money';

const view: View = { money: LEI, real: false };

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('chartRows', () => {
  it('keeps the final month even when the horizon is not a whole number of years', () => {
    const result = simulate({ ...baseInputs, horizonYears: 2.5 });
    const rows = chartRows(result, view);
    const lastMonth = result.rows[result.rows.length - 1].month;
    expect(rows[rows.length - 1].month).toBe(lastMonth);
    expect(rows[rows.length - 1].year).toBeCloseTo(lastMonth / 12);
  });

  it('keeps every month so steps such as the end of the fixed rate fall where they happen', () => {
    const result = simulate({ ...baseInputs, horizonYears: 10 });
    expect(chartRows(result, view)).toHaveLength(result.rows.length);
  });

  it('converts to euro and to today\'s money', () => {
    const result = simulate(baseInputs);
    const row = result.rows[24];
    const [mapped] = chartRows({ ...result, rows: [row] }, { money: euro(5), real: true });
    expect(mapped.buyer).toBeCloseTo(row.buyerNetWorth / row.deflator / 5);
  });
});

describe('breakEvenX', () => {
  const at = (breakEvenMonth: number | null) => breakEvenX({ breakEvenMonth } as Result);
  it('places the marker at the exact month, in years', () => {
    expect(at(28)).toBeCloseTo(28 / 12);
  });
  it('has no marker when the buyer never catches up or leads from the start', () => {
    expect(at(null)).toBeNull();
    expect(at(0)).toBeNull();
  });
});

describe('yearTicks', () => {
  it('uses evenly spaced whole years', () => {
    expect(yearTicks(30)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(yearTicks(3)).toEqual([0, 1, 2, 3]);
    expect(yearTicks(8)).toEqual([0, 2, 4, 6, 8]);
    expect(yearTicks(50)).toEqual([0, 10, 20, 30, 40, 50]);
  });
  it('stops at the horizon', () => {
    expect(yearTicks(2.5)).toEqual([0, 1, 2]);
  });
});

describe('niceTicks', () => {
  it('spans the data with round steps', () => {
    expect(niceTicks(0, 999_600)).toEqual([0, 200_000, 400_000, 600_000, 800_000, 1_000_000]);
    expect(niceTicks(-120_000, 1_650_000)).toEqual([-500_000, 0, 500_000, 1_000_000, 1_500_000, 2_000_000]);
    expect(niceTicks(0, 4_400)).toEqual([0, 1_000, 2_000, 3_000, 4_000, 5_000]);
  });
  it('copes with flat data', () => {
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });
});

describe('axisShort', () => {
  it('shows the full number when the axis stays below ten thousand', () => {
    const fmt = axisShort([0, 1_500, 3_000, 4_500, 6_000], 'lei');
    expect(fmt(1_500)).toBe('1.500 lei');
    expect(fmt(4_500)).toBe('4.500 lei');
  });
  it('keeps the decimals a tick needs', () => {
    const mii = axisShort([0, 12_500, 25_000], 'lei');
    expect(mii(12_500)).toBe('12,5 mii lei');
    const mil = axisShort([0, 500_000, 1_000_000, 1_500_000, 2_000_000], '€');
    expect(mil(1_650_000)).toBe('1,65 mil. €');
    expect(mil(500_000)).toBe('0,5 mil. €');
  });
  it('uses one unit for the whole axis, so a tick near a million never reads "1.000 mii"', () => {
    const fmt = axisShort(niceTicks(0, 999_600), 'lei');
    expect(fmt(1_000_000)).toBe('1 mil. lei');
    expect(fmt(800_000)).toBe('0,8 mil. lei');
  });
  it('keeps the sign and never prints -0', () => {
    const fmt = axisShort([-500_000, 0, 500_000, 1_000_000], 'lei');
    expect(fmt(-500_000)).toBe('-0,5 mil. lei');
    expect(fmt(-0)).toBe('0 lei');
  });
});

describe('chart text alternatives', () => {
  const result = simulate(baseInputs);
  it.each([
    ['net worth', () => <NetWorthChart result={result} view={view} />, /averea netă/i],
    ['monthly costs', () => <MonthlyCostsChart result={result} view={view} />, /cost/i],
    ['breakdown', () => <BreakdownChart result={result} view={view} />, /unde se duc banii/i],
  ])('names the %s chart and summarises it in text', (_, make, name) => {
    render(make());
    const figure = screen.getByRole('figure');
    expect(figure).toHaveAccessibleName(name);
    expect(figure.textContent).toMatch(/lei/);
  });
});
