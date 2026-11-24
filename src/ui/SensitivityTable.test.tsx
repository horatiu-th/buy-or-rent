import { render, screen, within } from '@testing-library/react';
import { SensitivityTable, SwingsTable } from './SensitivityTable';
import { LEI } from '../test/money';

const grid = [
  [-30000, -10000, 5000],
  [-20000, 12000, 40000],
  [-5000, 25000, 60000],
];

function renderTable() {
  render(<SensitivityTable grid={grid} baseGrowth={0.03} baseReturn={0.07} money={LEI} />);
  return screen.getByRole('table');
}

describe('SensitivityTable', () => {
  it('has a caption that names the table', () => {
    expect(renderTable()).toHaveAccessibleName(/Diferența de avere netă la final/);
  });

  it('scopes column and row headers', () => {
    renderTable();
    for (const th of screen.getAllByRole('columnheader')) expect(th).toHaveAttribute('scope', 'col');
    const rows = screen.getAllByRole('rowheader');
    expect(rows).toHaveLength(3);
    for (const th of rows) expect(th).toHaveAttribute('scope', 'row');
  });

  it('says who wins in each cell without relying on colour', () => {
    renderTable();
    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('30.000 lei');
    expect(cells[0]).toHaveTextContent('închirierea câștigă');
    expect(cells[2]).toHaveTextContent('5.000 lei');
    expect(cells[2]).toHaveTextContent('cumpărarea câștigă');
  });

  it('marks the cell for the current inputs explicitly', () => {
    renderTable();
    const base = screen.getAllByRole('cell')[4];
    expect(base).toHaveClass('is-base');
    expect(base).toHaveTextContent('valorile tale');
    expect(screen.getAllByRole('cell').filter((c) => c.classList.contains('is-base'))).toHaveLength(1);
  });

  it('scrolls sideways inside its own focusable region on narrow screens', () => {
    const table = renderTable();
    const region = table.closest('.table-scroll');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveAttribute('role', 'region');
    expect(within(region as HTMLElement).getByRole('table')).toBe(table);
  });
});

describe('SwingsTable', () => {
  const swings = [
    { key: 'rent' as const, down: { value: 2_250, gap: -8_000 }, up: { value: 2_750, gap: 30_000 } },
    { key: 'irccLongRun' as const, down: { value: 0.035, gap: 20_000 }, up: { value: 0.055, gap: 4_000 } },
  ];

  it('shows each assumption moved down and up next to the base case', () => {
    render(<SwingsTable swings={swings} base={12_000} money={LEI} />);
    const [rent, ircc] = screen.getAllByRole('row').slice(1);
    expect(within(rent).getByRole('rowheader')).toHaveTextContent('Chirie lunară (±10%)');
    const cells = within(rent).getAllByRole('cell');
    expect(cells[0].querySelector('.swing-setting')).toHaveTextContent('2.250 lei');
    expect(cells[0].querySelector('.gap-amount')).toHaveTextContent('8.000 lei');
    expect(cells[0]).toHaveTextContent('închirierea câștigă');
    expect(cells[1]).toHaveTextContent('12.000 lei');
    expect(cells[1]).toHaveClass('is-base');
    expect(cells[2].querySelector('.swing-setting')).toHaveTextContent('2.750 lei');
    expect(cells[2].querySelector('.gap-amount')).toHaveTextContent('30.000 lei');
    expect(within(ircc).getAllByRole('cell')[0].querySelector('.swing-setting')).toHaveTextContent('3,5%');
  });
});

