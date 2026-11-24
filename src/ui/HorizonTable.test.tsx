import { render, screen, within } from '@testing-library/react';
import { HorizonTable } from './HorizonTable';
import type { HorizonResult } from '../engine';
import { LEI } from '../test/money';

const rows: HorizonResult[] = [
  { years: 5, gap: -20_000, deflator: 1, eq: { kind: 'value', rent: 3_000 } },
  { years: 10, gap: 22_000, deflator: 1.1, eq: { kind: 'alwaysBuy' } },
  { years: 30, gap: 100_000, deflator: 2, eq: { kind: 'noThreshold' } },
];

function renderTable(real = true) {
  render(<HorizonTable rows={rows} chosenYears={30} real={real} money={LEI} />);
  return screen.getByRole('table');
}

describe('HorizonTable', () => {
  it('lists each horizon with its rent threshold', () => {
    renderTable();
    const [first, second, third] = screen.getAllByRole('row').slice(1);
    expect(within(first).getByRole('rowheader')).toHaveTextContent('5 ani');
    expect(first).toHaveTextContent('3.000 lei');
    expect(second).toHaveTextContent('cumpărarea câștigă la orice chirie');
    expect(third).toHaveTextContent('—');
  });

  it('marks the chosen horizon', () => {
    renderTable();
    const chosen = screen.getAllByRole('row').find((r) => r.classList.contains('is-base'))!;
    expect(chosen).toHaveTextContent('30 de ani (orizontul tău)');
  });

  it('shows gaps in today\'s lei, or nominal on request, and says who wins in words', () => {
    renderTable();
    const cells = screen.getAllByRole('cell');
    expect(cells[1]).toHaveTextContent('20.000 lei');
    expect(cells[1]).not.toHaveTextContent('-');
    expect(cells[1]).toHaveTextContent('închirierea câștigă');
    expect(cells[3]).toHaveTextContent('20.000 lei');
    expect(cells[3]).toHaveTextContent('cumpărarea câștigă');
    expect(cells[5]).toHaveTextContent('50.000 lei');
    expect(screen.getByRole('columnheader', { name: /lei de azi/ })).toBeInTheDocument();
  });

  it('shows nominal gaps when the view is nominal', () => {
    renderTable(false);
    expect(screen.getAllByRole('cell')[5]).toHaveTextContent('100.000 lei');
    expect(screen.getByRole('columnheader', { name: /valori nominale/ })).toBeInTheDocument();
  });
});
