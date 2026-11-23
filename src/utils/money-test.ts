import { formatMoney, formatPriceInput, parsePriceToCents } from '@/utils/money';

describe('formatMoney', () => {
  it('formats integer cents as currency', () => {
    expect(formatMoney(0)).toBe('R$0.00');
    expect(formatMoney(1234)).toBe('R$12.34');
    expect(formatMoney(100000)).toBe('R$1,000.00');
  });

  it('keeps negative adjustments visible', () => {
    expect(formatMoney(-250)).toBe('-R$2.50');
  });
});

describe('parsePriceToCents', () => {
  it('converts decimal amounts to integer cents without rounding', () => {
    expect(parsePriceToCents('12.50')).toBe(1250);
    expect(parsePriceToCents('0')).toBe(0);
    expect(parsePriceToCents('0.05')).toBe(5);
    expect(parsePriceToCents('1,23')).toBe(123);
  });

  it('rejects invalid, negative, and unsafe amounts', () => {
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('12.345')).toBeNull();
    expect(parsePriceToCents('-1')).toBeNull();
    expect(parsePriceToCents('1,000.00')).toBeNull();
    expect(parsePriceToCents('9007199254740992')).toBeNull();
  });
});

describe('formatPriceInput', () => {
  it('renders integer cents as a decimal form value', () => {
    expect(formatPriceInput(1250)).toBe('12.50');
    expect(formatPriceInput(5)).toBe('0.05');
    expect(formatPriceInput(0)).toBe('0.00');
  });
});
