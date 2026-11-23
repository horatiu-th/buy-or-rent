import { render, screen, within } from '@testing-library/react';
import { SensitivityTable } from './SensitivityTable';

const grid = [
  [-30000, -10000, 5000],
  [-20000, 12000, 40000],
  [-5000, 25000, 60000],
];

function renderTable() {
  render(<SensitivityTable grid={grid} baseGrowth={0.03} baseReturn={0.07} currency="RON" eurRon={5} />);
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
    expect(cells[0]).toHaveTextContent('-30.000 lei');
    expect(cells[0]).toHaveTextContent('închirierea câștigă');
    expect(cells[2]).toHaveTextContent('+5.000 lei');
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
