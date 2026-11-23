import { render, screen } from '@testing-library/react';
import { Headline } from './Headline';

const sale = { includeSaleCosts: true, saleTaxShortPct: 0.03, saleTaxLongPct: 0.01, saleTaxShortHoldYears: 3 };

function renderHeadline(props: Partial<Parameters<typeof Headline>[0]> = {}) {
  render(
    <Headline
      eq={{ kind: 'value', rent: 2500 }}
      breakEvenMonth={27}
      sale={sale}
      currency="RON"
      eurRon={5}
      {...props}
    />,
  );
}

const NOTE = /presupune vânzarea/;

describe('Headline', () => {
  it('says the buyer moves ahead and stays ahead', () => {
    renderHeadline();
    expect(
      screen.getByText('Pentru cifrele tale, cumpărarea trece în față după 2 ani și 3 luni și rămâne în față până la final.'),
    ).toBeInTheDocument();
  });

  it('explains the sale-tax step with a grammatical duration', () => {
    renderHeadline();
    expect(screen.getByText(NOTE)).toHaveTextContent('scade după 3 ani,');
  });

  it('uses the singular for a one-year threshold', () => {
    renderHeadline({ sale: { ...sale, saleTaxShortHoldYears: 1 } });
    expect(screen.getByText(NOTE)).toHaveTextContent('scade după 1 an,');
  });

  it.each([
    ['sale costs are excluded', { sale: { ...sale, includeSaleCosts: false } }],
    ['there is no break-even', { breakEvenMonth: null }],
    ['the short-hold tax is not higher', { sale: { ...sale, saleTaxShortPct: 0.01 } }],
    ['there is no short-hold threshold', { sale: { ...sale, saleTaxShortHoldYears: 0 } }],
  ])('hides the sale-tax note when %s', (_, props) => {
    renderHeadline(props);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('announces only the verdict', () => {
    renderHeadline();
    expect(screen.getByText(/trece în față/)).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('headline').closest('[aria-live]')).toBeNull();
  });
});
