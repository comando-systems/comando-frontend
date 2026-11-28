import {
  buildOrderPreview,
  calculateServiceFeeCents,
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
    expect(preview.adjustedCents).toBe(2550);
    expect(preview.discountCents).toBe(200);
    expect(preview.serviceFeeCents).toBe(255);
    expect(preview.totalCents).toBe(2805);
    expect(preview.lines[0].lineTotalCents).toBe(1000);
  });

  it('allows a discount above the adjusted subtotal without charging a fee', () => {
    const preview = buildOrderPreview(lines, {
      surchargeCents: 500,
      discountCents: 9999,
      applyServiceFee: true,
      serviceFeeBasisPoints: 1000,
    });

    expect(preview.discountCents).toBe(9999);
    expect(preview.adjustedCents).toBe(-7249);
    expect(preview.serviceFeeCents).toBe(0);
    expect(preview.totalCents).toBe(-7249);
  });

  it('normalizes non-finite line quantities to one', () => {
    const preview = buildOrderPreview(
      [{ itemId: '3', itemName: 'Tea', unitPriceCents: 300, quantity: Number.NaN }],
      {
        surchargeCents: 0,
        discountCents: 0,
        applyServiceFee: false,
        serviceFeeBasisPoints: 0,
      },
    );

    expect(preview.lines[0].quantity).toBe(1);
    expect(preview.subtotalCents).toBe(300);
  });
});
