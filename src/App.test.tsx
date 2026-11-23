import { fireEvent, render, screen } from '@testing-library/react';
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

it('lets the area be cleared and retyped', async () => {
  render(<App />);
  const sqm = screen.getByLabelText('Suprafață (m²)');
  await userEvent.clear(sqm);
  expect(sqm).toHaveValue(null);
  await userEvent.type(sqm, '7');
  expect(window.location.search).not.toContain('mp=');
  await userEvent.type(sqm, '0');
  expect(window.location.search).toContain('mp=70');
});

it('groups the property type radios', () => {
  render(<App />);
  const [a, b] = screen.getAllByRole('radio');
  expect(a.getAttribute('name')).toBeTruthy();
  expect(a.getAttribute('name')).toBe(b.getAttribute('name'));
});

describe('interest presets', () => {
  it('switches between fixed and variable and shows the active one', async () => {
    render(<App />);
    const fixed = screen.getByRole('button', { name: 'Fix 5 ani' });
    const variable = screen.getByRole('button', { name: 'Variabilă' });

    await userEvent.click(variable);
    expect(window.location.search).toContain('fixedYears=0');
    expect(variable).toHaveAttribute('aria-pressed', 'true');
    expect(fixed).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Dobândă fixă')).toBeDisabled();

    await userEvent.click(fixed);
    expect(window.location.search).toContain('fixedYears=5');
    expect(fixed).toHaveAttribute('aria-pressed', 'true');
    expect(variable).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Dobândă fixă')).toBeEnabled();
  });

  it('presses neither preset for another fixed period', () => {
    window.history.replaceState(null, '', '/?fixedYears=3');
    render(<App />);
    expect(screen.getByRole('button', { name: 'Fix 5 ani' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Variabilă' })).toHaveAttribute('aria-pressed', 'false');
  });
});

it('moves the rent with the rent scale slider', () => {
  render(<App />);
  const slider = screen.getByRole('slider', { name: 'Ajustează chiria' });
  fireEvent.change(slider, { target: { value: '1500' } });
  expect(new URLSearchParams(window.location.search).get('rent')).toBe('1500');
  expect(screen.getByLabelText('Chirie lunară')).toHaveValue(1500);
});
