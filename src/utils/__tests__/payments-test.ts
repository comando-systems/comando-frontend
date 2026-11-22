import {
  createPaymentRow,
  parseWholeCents,
  paymentDraftTotalCents,
  paymentInputsFromRows,
  validatePaymentRows,
} from '@/utils/payments';

describe('payment helpers', () => {
  it('parses only whole non-negative cent amounts', () => {
    expect(parseWholeCents('1500')).toBe(1500);
    expect(parseWholeCents(' 15 ')).toBe(15);
    expect(parseWholeCents('15.5')).toBeNull();
    expect(parseWholeCents('-1')).toBeNull();
    expect(parseWholeCents('')).toBeNull();
  });

  it('builds split payment inputs and omits received cents for non-cash methods', () => {
    const rows = [
      createPaymentRow({ id: 'cash', method: 'CASH', amountCents: '600', receivedCents: '1000' }),
      createPaymentRow({ id: 'card', method: 'DEBIT_CARD', amountCents: '900', receivedCents: '900' }),
    ];

    expect(paymentDraftTotalCents(rows)).toBe(1500);
    expect(paymentInputsFromRows(rows)).toEqual([
      { method: 'CASH', amountCents: 600, receivedCents: 1000 },
      { method: 'DEBIT_CARD', amountCents: 900 },
    ]);
    expect(validatePaymentRows(rows, 1500)).toBe(
      'Only cash payments can record an amount received.',
    );
  });

  it('accepts an exact split total', () => {
    const rows = [
      createPaymentRow({ id: 'cash', method: 'CASH', amountCents: '600' }),
      createPaymentRow({ id: 'pix', method: 'PIX', amountCents: '900' }),
    ];

    expect(validatePaymentRows(rows, 1500)).toBeNull();
  });

  it('rejects an empty, invalid, or mismatched payment set', () => {
    expect(validatePaymentRows([], 1500)).toBe('Add at least one payment.');
    expect(
      validatePaymentRows([createPaymentRow({ amountCents: '0' })], 1500),
    ).toBe('Every payment needs a positive amount in cents.');
    expect(
      validatePaymentRows([createPaymentRow({ amountCents: '1000' })], 1500),
    ).toBe('Payment amounts must equal the order total.');
    expect(
      validatePaymentRows(
        [createPaymentRow({ method: 'CASH', amountCents: '1000', receivedCents: '500' })],
        1000,
      ),
    ).toBe('Amount received cannot be less than the payment amount.');
  });
});
