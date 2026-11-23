import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SourcedValue } from '../data/schema';
import { FIELDS } from './fields';
import { InputField } from './InputField';

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
      currency="RON"
      eurRon={5}
      onChange={onChange}
      onReset={() => {}}
      {...props}
    />,
  );
  return onChange;
}

describe('InputField', () => {
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
    const onChange = renderField({ def: def('price'), value: 510000, currency: 'EUR', eurRon: 5.0975 });
    const input = screen.getByLabelText('Preț locuință');
    await userEvent.clear(input);
    await userEvent.type(input, '1234');
    expect(onChange).toHaveBeenLastCalledWith(Math.round(1234 * 5.0975));
  });

  it('uses a free step for money in euro', () => {
    renderField({ def: def('price'), value: 510000, currency: 'EUR', eurRon: 5.1 });
    expect(screen.getByLabelText('Preț locuință')).toHaveAttribute('step', 'any');
  });

  it('toggles a help paragraph that describes the input', async () => {
    renderField({ source: source({}) });
    const input = screen.getByLabelText('Chirie lunară');
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Chiria pentru o locuință comparabilă.')).not.toBeVisible();
    expect(input).toHaveAccessibleDescription(/Sursa X/);

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Chiria pentru o locuință comparabilă.')).toBeVisible();
    expect(input).toHaveAccessibleDescription(/Chiria pentru o locuință comparabilă\..*Sursa X/);
  });

  it('shows help and source together in a popover next to the info button', async () => {
    renderField({ source: source({}) });
    const toggle = screen.getByRole('button', { name: /Ajutor/ });
    await userEvent.click(toggle);
    const popover = screen.getByRole('note');
    expect(popover).toBeVisible();
    expect(popover).toHaveTextContent('Chiria pentru o locuință comparabilă.');
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
});
