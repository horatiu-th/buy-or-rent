import { render, screen } from '@testing-library/react';
import { Headline } from './Headline';
import { LEI } from '../test/money';

const sale = { includeSaleCosts: true, saleTaxShortPct: 0.03, saleTaxLongPct: 0.01, saleTaxShortHoldYears: 3 };

function renderHeadline(props: Partial<Parameters<typeof Headline>[0]> = {}) {
  render(
    <Headline
      eq={{ kind: 'value', rent: 2500 }}
      horizonMonths={240}
      breakEvenMonth={27}
      buyerEverAhead
      sale={sale}
      money={LEI}
      {...props}
    />,
  );
}

const NOTE = /presupune vânzarea/;

describe('Headline', () => {
  it.each([{ kind: 'value', rent: 2500 }, { kind: 'alwaysBuy' }, { kind: 'alwaysRent' }] as const)(
    'names the horizon and investing renter for $kind', (eq) => {
      renderHeadline({ eq });
      expect(screen.getByTestId('headline')).toHaveTextContent(/După 20 de ani.*chiriașul care investește/);
    },
  );

  it('says the buyer moves ahead and stays ahead', () => {
    renderHeadline();
    expect(
      screen.getByText('Pentru cifrele tale, cumpărarea trece în față după 2 ani și 3 luni și rămâne în față până la final.'),
    ).toBeInTheDocument();
  });

  it('says buying is ahead from the start instead of after zero months', () => {
    renderHeadline({ breakEvenMonth: 0 });
    expect(screen.getByText(/trece în față|e în față/)).toHaveTextContent(
      'Pentru cifrele tale, cumpărarea e în față de la început și rămâne în față până la final.',
    );
    expect(screen.queryByText(/după 0 luni/)).not.toBeInTheDocument();
  });

  it('says renting wins over the whole horizon only when the buyer is never ahead', () => {
    renderHeadline({ breakEvenMonth: null, buyerEverAhead: false });
    expect(screen.getByText('Pentru cifrele tale, închirierea rămâne mai avantajoasă pe tot orizontul.')).toBeInTheDocument();
  });

  it('says renting wins at the end when the buyer led only part of the way', () => {
    renderHeadline({ breakEvenMonth: null, buyerEverAhead: true });
    expect(screen.queryByText(/pe tot orizontul/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Pentru cifrele tale, închirierea e mai avantajoasă la final, deși cumpărarea a fost în față o vreme.'),
    ).toBeInTheDocument();
  });

  it('asks to check the inputs when they cannot be computed', () => {
    renderHeadline({ eq: { kind: 'invalid' } });
    expect(screen.getByTestId('headline')).toHaveTextContent('Verifică valorile introduse');
    expect(screen.queryByText(/trece în față/)).not.toBeInTheDocument();
  });

  it('says there is no rent threshold when a higher rent favours the renter', () => {
    renderHeadline({ eq: { kind: 'noThreshold' } });
    expect(screen.getByTestId('headline')).toHaveTextContent(/nu există o chirie peste care cumpărarea câștigă/);
  });

  it('rounds a fractional short-hold threshold to whole months', () => {
    renderHeadline({ sale: { ...sale, saleTaxShortHoldYears: 3.3 } });
    expect(screen.getByText(NOTE)).toHaveTextContent('scade după 3 ani și 4 luni,');
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
    ['the buyer is ahead from the start', { breakEvenMonth: 0 }],
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
