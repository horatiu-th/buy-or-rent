import { fireEvent, render, screen } from '@testing-library/react';
import type { EquivalentRent } from '../engine';
import { RentScale } from './RentScale';
import { LEI } from '../test/money';

function setup(eq: EquivalentRent, rent: number) {
  const onRentChange = vi.fn();
  const props = { eq, price: 500000, money: LEI, onRentChange };
  const view = render(<RentScale {...props} rent={rent} />);
  const slider = () => screen.getByRole('slider', { name: 'Ajustează chiria' });
  return { slider, onRentChange, rerender: (r: number) => view.rerender(<RentScale {...props} rent={r} />), container: view.container };
}

describe('RentScale', () => {
  it('scales to twice the break-even rent', () => {
    const { slider } = setup({ kind: 'value', rent: 2000 }, 1500);
    expect(slider()).toHaveAttribute('max', '4000');
    expect(slider()).toHaveValue('1500');
  });

  it('extends the scale to a rent above it instead of pinning the slider at the end', () => {
    const { slider } = setup({ kind: 'value', rent: 2000 }, 6300);
    expect(Number(slider().getAttribute('max'))).toBeGreaterThanOrEqual(6300);
    expect(slider()).toHaveValue('6300');
  });

  it('keeps the scale still while the slider is in use', () => {
    const { slider, rerender, onRentChange } = setup({ kind: 'value', rent: 2000 }, 6300);
    const max = slider().getAttribute('max');
    fireEvent.focus(slider());
    fireEvent.change(slider(), { target: { value: '3000' } });
    expect(onRentChange).toHaveBeenLastCalledWith(3000);
    rerender(3000);
    expect(slider()).toHaveAttribute('max', max);
    fireEvent.blur(slider());
    expect(slider()).toHaveAttribute('max', '4000');
  });

  it.each(['alwaysBuy', 'alwaysRent'] as const)('labels only the winning side for %s', (kind) => {
    setup({ kind }, 2000);
    const buying = screen.queryByText('Cumpărarea câștigă');
    const renting = screen.queryByText('Închirierea câștigă');
    expect(kind === 'alwaysBuy' ? buying : renting).toBeVisible();
    expect(kind === 'alwaysBuy' ? renting : buying).toBeNull();
  });

  it.each(['invalid', 'noThreshold'] as const)('shows no winner or threshold for %s', (kind) => {
    const { container } = setup({ kind }, 2000);
    expect(container.querySelector('.rent-scale')).not.toHaveClass('buyer-wins');
    expect(container.querySelector('.rent-scale')).not.toHaveClass('renter-wins');
    expect(screen.queryByText(/câștigă/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prag/)).not.toBeInTheDocument();
  });
});
