import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SourcedValue } from '../data/schema';
import { FIELDS } from './fields';
import { InputField } from './InputField';
import { t } from '../i18n';
import { LEI, euro } from '../test/money';

const def = (key: string) => FIELDS.find((f) => f.key === key)!;

const source = (over: Partial<SourcedValue>): SourcedValue => ({
  value: 1, unit: 'lei', source: 'Sursa X', asOf: '2026-01-01', status: 'ok', ...over,
});

function renderField(props: Partial<Parameters<typeof InputField>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <InputField
      def={def('rent')}
      value={2000}
      isOverridden={false}
      money={LEI}
      onChange={onChange}
      onReset={() => {}}
      {...props}
    />,
  );
  return onChange;
}

describe('InputField', () => {
  it.each([
    ['downPaymentPct', LEI, '%'], ['rent', euro(5), '€'], ['rent', LEI, 'lei'],
    ['fixedYears', LEI, 'ani'], ['depositMonths', LEI, 'luni'],
  ] as const)('exposes the unit for %s', (key, money, unit) => {
    renderField({ def: def(key), value: 2, money });
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(unit);
  });

  it('converts percentages without float noise', async () => {
    const onChange = renderField({ def: def('downPaymentPct'), value: 0.15 });
    const input = screen.getByLabelText('Avans');
    await userEvent.clear(input);
    await userEvent.type(input, '7.5');
    expect(onChange).toHaveBeenLastCalledWith(0.075);
    await userEvent.clear(input);
    await userEvent.type(input, '1.1');
    expect(onChange).toHaveBeenLastCalledWith(0.011);
  });

  it('converts euro money to whole lei', async () => {
    const onChange = renderField({ def: def('price'), value: 510000, money: euro(5.0975) });
    const input = screen.getByLabelText('Preț locuință');
    await userEvent.clear(input);
    await userEvent.type(input, '1234');
    expect(onChange).toHaveBeenLastCalledWith(Math.round(1234 * 5.0975));
  });

  it('accepts a decimal comma', async () => {
    const onChange = renderField({ def: def('downPaymentPct'), value: 0.15 });
    const input = screen.getByLabelText('Avans');
    await userEvent.clear(input);
    await userEvent.type(input, '4,5');
    expect(onChange).toHaveBeenLastCalledWith(0.045);
  });

  it('reads a Romanian thousands separator in amounts', async () => {
    const onChange = renderField({ def: def('price'), value: 500000 });
    const input = screen.getByLabelText('Preț locuință');
    await userEvent.clear(input);
    await userEvent.type(input, '664.819');
    expect(onChange).toHaveBeenLastCalledWith(664819);
  });

  it('groups large amounts while not editing them', async () => {
    renderField({ def: def('price'), value: 664819 });
    const input = screen.getByLabelText('Preț locuință');
    expect(input).toHaveValue('664.819');
    await userEvent.click(input);
    expect(input).toHaveValue('664819');
  });

  it('shows percentages with a decimal comma', () => {
    renderField({ def: def('fixedRate'), value: 0.0575 });
    expect(screen.getByLabelText('Dobândă fixă')).toHaveValue('5,75');
  });

  it('caps a typed value at the field maximum', async () => {
    const onChange = renderField({ def: def('horizonYears'), value: 30 });
    const input = screen.getByLabelText('Orizont de analiză');
    await userEvent.clear(input);
    await userEvent.type(input, '2000');
    expect(onChange).toHaveBeenLastCalledWith(50);
    expect(onChange).not.toHaveBeenCalledWith(2000);
  });

  it('waits for the user to leave the field before raising a value below the minimum', async () => {
    const onChange = renderField({ def: def('price'), value: 500000 });
    const input = screen.getByLabelText('Preț locuință');
    await userEvent.clear(input);
    await userEvent.type(input, '-100000');
    expect(onChange).not.toHaveBeenCalledWith(-100000);
    expect(onChange).not.toHaveBeenCalledWith(0);
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('rounds years to whole numbers', async () => {
    const onChange = renderField({ def: def('horizonYears'), value: 30 });
    const input = screen.getByLabelText('Orizont de analiză');
    await userEvent.clear(input);
    await userEvent.type(input, '2,5');
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('steps with the arrow keys', async () => {
    const onChange = renderField({ def: def('rent'), value: 2000 });
    await userEvent.click(screen.getByLabelText('Chirie lunară'));
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(2050);
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(1950);
  });

  it('steps euro amounts by a round number of euro', async () => {
    const onChange = renderField({ def: def('price'), value: 510000, money: euro(5.1) });
    await userEvent.click(screen.getByLabelText('Preț locuință'));
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(Math.round(100200 * 5.1));
  });

  it('toggles a help paragraph that describes the input', async () => {
    renderField({ source: source({}) });
    const input = screen.getByLabelText('Chirie lunară');
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(t.fields.rent.help)).not.toBeVisible();
    expect(input).toHaveAccessibleDescription(/Sursa X/);

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(t.fields.rent.help)).toBeVisible();
    expect(input).toHaveAccessibleDescription(/Chiria pentru o locuință comparabilă\..*Sursa X/);
  });

  it('shows help and source together in a popover next to the info button', async () => {
    renderField({ source: source({}) });
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    await userEvent.click(toggle);
    const popover = screen.getByRole('note');
    expect(popover).toBeVisible();
    expect(popover).toHaveTextContent(t.fields.rent.help);
    expect(popover).toHaveTextContent('Sursa X');
    expect(toggle.parentElement).toContainElement(popover);
  });

  it('closes the popover with Escape and returns focus to the button', async () => {
    renderField({ source: source({}) });
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    await userEvent.click(toggle);
    await userEvent.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('closes the popover when clicking elsewhere', async () => {
    renderField({ source: source({}) });
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    await userEvent.click(toggle);
    await userEvent.click(document.body);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the popover when focus moves out of it', async () => {
    renderField({ source: source({}) });
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.tab();
    expect(screen.getByLabelText('Chirie lunară')).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('asks to check a source whose validity date has passed', () => {
    renderField({ source: source({ validUntil: '2000-01-01' }) });
    expect(screen.getByLabelText('Chirie lunară')).toHaveAccessibleDescription(/de verificat/);
  });

  it('says nothing extra while a source is still valid', () => {
    renderField({ source: source({ validUntil: '2999-01-01' }) });
    expect(screen.getByLabelText('Chirie lunară')).not.toHaveAccessibleDescription(/de verificat/);
  });
});
