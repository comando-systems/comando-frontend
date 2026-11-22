import { formatMoney } from '@/utils/money';

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
