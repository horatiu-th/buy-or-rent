import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemePicker } from './ThemePicker';
import { useTheme } from './theme';

function Harness() {
  const { choice, setChoice } = useTheme();
  return <ThemePicker choice={choice} onChange={setChoice} />;
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemePicker', () => {
  it('follows the system setting until a theme is chosen', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Temă: Ca sistemul' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applies and remembers the chosen theme', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /^Temă/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Miezul nopții' }));
    expect(document.documentElement.dataset.theme).toBe('midnight');
    expect(localStorage.getItem('theme')).toBe('midnight');
    expect(screen.getByRole('button', { name: 'Temă: Miezul nopții' })).toBeInTheDocument();
  });

  it('restores a remembered theme and ignores unknown ones', () => {
    localStorage.setItem('theme', 'graphite');
    const { unmount } = render(<Harness />);
    expect(document.documentElement.dataset.theme).toBe('graphite');
    unmount();
    localStorage.setItem('theme', 'neon');
    render(<Harness />);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('offers at least five themes besides the system one', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /^Temă/ }));
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(6);
  });

  it('closes on Escape and returns focus to the button', async () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: /^Temă/ });
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });
});

describe('ThemePicker keyboard and focus', () => {
  it('toggles closed with Enter on its button', async () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: /^Temă/ });
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('confirms with Enter inside the list and returns focus to the button', async () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: /^Temă/ });
    await userEvent.click(button);
    expect(screen.getByRole('radio', { name: 'Ca sistemul' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes when focus moves outside it', async () => {
    render(<><Harness /><button type="button">după</button></>);
    const button = screen.getByRole('button', { name: /^Temă/ });
    await userEvent.click(button);
    act(() => screen.getByRole('button', { name: 'după' }).focus());
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
