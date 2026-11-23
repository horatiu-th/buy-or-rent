import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { loadDefaults } from './data/defaults';

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

beforeEach(() => window.history.replaceState(null, '', '/'));

it('updates the headline when the city changes', async () => {
  render(<App />);
  const before = screen.getByTestId('headline').textContent;
  await userEvent.selectOptions(screen.getByLabelText('Oraș'), 'cluj');
  expect(screen.getByTestId('headline').textContent).not.toBe(before);
});

it('writes edited values to the URL', async () => {
  render(<App />);
  const rent = screen.getByLabelText('Chirie lunară');
  await userEvent.clear(rent);
  await userEvent.type(rent, '1234');
  expect(window.location.search).toContain('rent=1234');
});

it('restores a scenario from the URL', () => {
  window.history.replaceState(null, '', '/?oras=iasi&rent=1999');
  render(<App />);
  expect(screen.getByLabelText('Oraș')).toHaveValue('iasi');
  expect(screen.getByLabelText('Chirie lunară')).toHaveValue(1999);
});

it('removes a field from the URL when it is reset', async () => {
  window.history.replaceState(null, '', '/?rent=1999');
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Revino la valoarea implicită: Chirie lunară' }));
  expect(window.location.search).not.toContain('rent=');
});

it('stores euro edits as whole lei in the URL', async () => {
  window.history.replaceState(null, '', '/?moneda=EUR');
  render(<App />);
  const price = screen.getByLabelText('Preț locuință');
  await userEvent.clear(price);
  await userEvent.type(price, '1234');
  const eurRon = loadDefaults().values.eurRon.value;
  expect(new URLSearchParams(window.location.search).get('price')).toBe(String(Math.round(1234 * eurRon)));
});

it('flags nominal views when showing today\'s money', async () => {
  window.history.replaceState(null, '', '/?moneda=EUR&real=1');
  render(<App />);
  expect(screen.getByLabelText('Ajustat cu inflația (€ de azi)')).toBeChecked();
  expect(screen.queryByText('Valori nominale')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'Sensibilitate' }));
  expect(screen.getByText('Valori nominale')).toBeInTheDocument();
});
