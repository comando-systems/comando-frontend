import { nextTableCode, resolveTableCode } from '@/utils/table-codes';

describe('table code helpers', () => {
  it('starts at Mesa 1 when no table is open', () => {
    expect(nextTableCode([])).toBe('Mesa 1');
    expect(nextTableCode([null, 'Counter 7'])).toBe('Mesa 1');
  });

  it('finds the first free index across different code formats', () => {
    expect(nextTableCode(['Mesa 1', 'Mesa 2', 'T-03', null])).toBe('Mesa 4');
    expect(nextTableCode(['Mesa 2', 'Mesa 4'])).toBe('Mesa 1');
  });

  it('uses a custom name only when one was provided', () => {
    expect(resolveTableCode('Mesa 3', '  ')).toBe('Mesa 3');
    expect(resolveTableCode('Mesa 3', '  VIP  ')).toBe('VIP');
  });
});
