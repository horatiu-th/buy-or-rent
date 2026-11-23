import { fireEvent, render, screen, within } from '@testing-library/react';
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

it('groups inputs by buying, renting, investing and general', () => {
  render(<App />);
  for (const name of ['Cumpărare', 'Închiriere', 'Investiții', 'General']) {
    expect(screen.getByRole('region', { name })).toBeInTheDocument();
  }
  expect(within(screen.getByRole('region', { name: 'Închiriere' })).getByLabelText('Chirie lunară')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Investiții' })).getByLabelText('Randament investiții')).toBeInTheDocument();
});

it('counts edits hidden inside the folded buying costs', () => {
  window.history.replaceState(null, '', '/?notaryPct=0.02&bankFees=2000');
  render(<App />);
  expect(screen.getByText('2 valori modificate')).toBeInTheDocument();
});

it('shows the renter who keeps savings in a deposit next to the investing renter', () => {
  render(<App />);
  expect(screen.getByText('Chiriaș care investește')).toBeInTheDocument();
  expect(screen.getByText('Chiriaș cu economii la depozit')).toBeInTheDocument();
});

it('collapses a group and counts the edits inside it', async () => {
  window.history.replaceState(null, '', '/?rent=2000&rentGrowth=0.05');
  render(<App />);
  const toggle = screen.getByRole('button', { name: /^Închiriere/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByLabelText('Chirie lunară')).toBeVisible();
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByLabelText('Chirie lunară')).not.toBeVisible();
  expect(within(toggle).getByText('2 valori modificate')).toBeInTheDocument();
});

it('shows the exchange rate in use and when BNR published it', () => {
  render(<App />);
  const { value, asOf } = loadDefaults().values.eurRon;
  const date = asOf.split('-').reverse().join('.');
  expect(screen.getByText(new RegExp(`Curs BNR: ${value.toLocaleString('ro-RO', { maximumFractionDigits: 4 })} lei/€, din ${date}`))).toBeInTheDocument();
});
