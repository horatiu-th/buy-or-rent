import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

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
