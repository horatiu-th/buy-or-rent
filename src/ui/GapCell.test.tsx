import { render, screen } from '@testing-library/react';
import { GapCell } from './GapCell';
import { LEI } from '../test/money';

function renderCell(gap: number, setting?: string) {
  render(<table><tbody><tr><GapCell gap={gap} setting={setting} money={LEI} /></tr></tbody></table>);
  return screen.getByRole('cell');
}

describe('GapCell', () => {
  it('shows the amount without a sign and names the winner in words', () => {
    const cell = renderCell(-8_000);
    expect(cell.querySelector('.gap-amount')).toHaveTextContent(/^8\.000 lei$/);
    expect(cell).toHaveTextContent('închirierea câștigă');
    expect(cell).toHaveClass('rent-wins');
  });

  it('shows an amount that prints as zero as a tie, naming no winner', () => {
    for (const gap of [0, -0.3, 0.4]) {
      const { unmount } = render(<table><tbody><tr><GapCell gap={gap} money={LEI} /></tr></tbody></table>);
      const cell = screen.getByRole('cell');
      expect(cell).toHaveClass('tie');
      expect(cell).toHaveTextContent('la egalitate');
      expect(cell).not.toHaveTextContent('câștigă');
      unmount();
    }
  });

  it('shows the assumption value above the amount', () => {
    const cell = renderCell(12_000, '3,5%');
    expect(cell.querySelector('.swing-setting')).toHaveTextContent('3,5%');
    expect(cell.querySelector('.gap-amount')).toHaveTextContent('12.000 lei');
  });
});
