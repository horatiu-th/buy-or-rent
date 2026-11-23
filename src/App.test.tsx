import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { loadDefaults } from './data/defaults';
import { ro } from './i18n/ro';

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
  expect(screen.getByLabelText('Chirie lunară')).toHaveValue('1.999');
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

it('keeps the summary adjustment independent of the nominal sensitivity table', async () => {
  window.history.replaceState(null, '', '/?moneda=EUR&real=1');
  render(<App />);
  const toggle = screen.getByRole('switch', { name: /Ajustat cu inflația/ });
  expect(toggle).toBeChecked();
  expect(toggle).toBeEnabled();
  expect(screen.queryByText(/Valori nominale/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'Sensibilitate' }));
  expect(toggle).toBeChecked();
  expect(screen.getByText(/Avere netă după.*lei de azi, convertiți în €/)).toBeVisible();
  expect(within(screen.getByRole('tabpanel')).getByText(/Valori nominale/)).toBeVisible();
  await userEvent.click(toggle);
  expect(screen.getByText(/Avere netă după.*valori nominale/)).toBeVisible();
  await userEvent.click(screen.getByRole('tab', { name: 'Avere netă' }));
  expect(toggle).toBeEnabled();
  expect(toggle).not.toBeChecked();
});

it('says what today\'s money means in euro', () => {
  window.history.replaceState(null, '', '/?moneda=EUR');
  render(<App />);
  const toggle = screen.getByRole('switch', { name: /Ajustat cu inflația/ });
  expect(toggle).toHaveAccessibleName(/inflația din România/);
  expect(toggle).toHaveAccessibleName(/cursul de azi/);
});

it('moves between chart tabs with Home and End', async () => {
  render(<App />);
  const first = screen.getByRole('tab', { name: 'Avere netă' });
  first.focus();
  await userEvent.keyboard('{End}');
  const last = screen.getByRole('tab', { name: 'Sensibilitate' });
  expect(last).toHaveFocus();
  expect(last).toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{Home}');
  expect(first).toHaveFocus();
  expect(first).toHaveAttribute('aria-selected', 'true');
});

it('lets the area be cleared and retyped', async () => {
  render(<App />);
  const sqm = screen.getByLabelText(ro.sqm);
  await userEvent.clear(sqm);
  expect(sqm).toHaveValue('');
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
  expect(screen.getByLabelText('Chirie lunară')).toHaveValue('1.500');
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

describe('typed values', () => {
  it('stores a capped value in the URL and shows it once the field is left', async () => {
    render(<App />);
    const horizon = screen.getByLabelText('Orizont de analiză');
    await userEvent.clear(horizon);
    await userEvent.type(horizon, '2000');
    expect(new URLSearchParams(window.location.search).get('horizonYears')).toBe('50');
    await userEvent.tab();
    expect(horizon).toHaveValue('50');
  });

  it('shows the price the simulation uses when a negative one is typed', async () => {
    render(<App />);
    const price = screen.getByLabelText('Preț locuință');
    await userEvent.clear(price);
    await userEvent.type(price, '-100000');
    expect(new URLSearchParams(window.location.search).get('price')).not.toBe('-100000');
    await userEvent.tab();
    expect(price).toHaveValue('0');
    expect(new URLSearchParams(window.location.search).get('price')).toBe('0');
  });

  it('accepts a decimal comma', async () => {
    render(<App />);
    const down = screen.getByLabelText('Avans');
    await userEvent.clear(down);
    await userEvent.type(down, '22,5');
    expect(new URLSearchParams(window.location.search).get('downPaymentPct')).toBe('0.225');
  });

  it('caps the area at its maximum', async () => {
    render(<App />);
    const sqm = screen.getByLabelText(ro.sqm);
    await userEvent.clear(sqm);
    await userEvent.type(sqm, '5000');
    expect(new URLSearchParams(window.location.search).get('mp')).toBe('500');
    await userEvent.tab();
    expect(sqm).toHaveValue('500');
  });

  it('rounds a fractional horizon from a link to whole years', () => {
    window.history.replaceState(null, '', '/?horizonYears=2.5');
    render(<App />);
    expect(screen.getByLabelText('Orizont de analiză')).toHaveValue('3');
    expect(new URLSearchParams(window.location.search).get('horizonYears')).toBe('3');
  });
});

it('drops an edited price and rent when the city changes, so the new city shows its own', async () => {
  window.history.replaceState(null, '', '/?price=123456&rent=1999&fixedRate=0.06');
  render(<App />);
  await userEvent.selectOptions(screen.getByLabelText('Oraș'), 'cluj');
  const q = new URLSearchParams(window.location.search);
  expect(q.has('price')).toBe(false);
  expect(q.has('rent')).toBe(false);
  expect(q.get('fixedRate')).toBe('0.06');
  expect(screen.getByLabelText('Chirie lunară')).not.toHaveValue('1.999');
});
