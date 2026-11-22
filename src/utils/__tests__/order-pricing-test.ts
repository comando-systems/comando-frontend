import {
  buildOrderPreview,
  calculateServiceFeeCents,
  clampDiscountCents,
  parseCentsInput,
} from '@/utils/order-pricing';

const lines = [
  { itemId: '1', itemName: 'Coffee', unitPriceCents: 500, quantity: 2 },
  { itemId: '2', itemName: 'Cake', unitPriceCents: 1250, quantity: 1 },
] as const;

describe('order pricing preview', () => {
  it('normalizes integer-cent input', () => {
    expect(parseCentsInput('250')).toBe(250);
    expect(parseCentsInput('-10')).toBe(0);
    expect(parseCentsInput('12.9')).toBe(12);
    expect(parseCentsInput('invalid')).toBe(0);
  });

  it('clamps discounts to the subtotal plus surcharge', () => {
    expect(clampDiscountCents(3000, 2250)).toBe(2250);
    expect(clampDiscountCents(-5, 2250)).toBe(0);
  });

  it('calculates the service fee with half-up rounding', () => {
    expect(calculateServiceFeeCents(100, 1000)).toBe(10);
    expect(calculateServiceFeeCents(99, 1000)).toBe(10);
    expect(calculateServiceFeeCents(100, 0)).toBe(0);
  });

  it('builds a display-only preview with the backend rounding rule', () => {
    const preview = buildOrderPreview(lines, {
      surchargeCents: 500,
      discountCents: 200,
      applyServiceFee: true,
      serviceFeeBasisPoints: 1000,
    });

    expect(preview.subtotalCents).toBe(2250);
    expect(preview.maxDiscountCents).toBe(2750);
    expect(preview.discountCents).toBe(200);
    expect(preview.serviceFeeCents).toBe(255);
    expect(preview.totalCents).toBe(2805);
    expect(preview.lines[0].lineTotalCents).toBe(1000);
  });

  it('keeps preview discounts within the allowed maximum', () => {
    const preview = buildOrderPreview(lines, {
      surchargeCents: 500,
      discountCents: 9999,
      applyServiceFee: false,
      serviceFeeBasisPoints: 0,
    });

    expect(preview.discountCents).toBe(2750);
    expect(preview.totalCents).toBe(0);
  });
});
