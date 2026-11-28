import {
  createPaymentRow,
  parseDraftCents,
  paymentDraftTotalCents,
  paymentInputsFromRows,
  validatePaymentRows,
} from '@/utils/payments';

describe('payment helpers', () => {
  it('parses decimal reais into integer cents with at most two decimals', () => {
    expect(parseDraftCents('15.00')).toBe(1500);
    expect(parseDraftCents(' 15,5 ')).toBe(1550);
    expect(parseDraftCents('0.07')).toBe(7);
    expect(parseDraftCents('15.555')).toBeNull();
    expect(parseDraftCents('-1')).toBeNull();
    expect(parseDraftCents('')).toBeNull();
    expect(parseDraftCents('99999999999999999999')).toBeNull();
  });

  it('accepts integer-cents strings as well as decimal reais text', () => {
    expect(parseDraftCents('1250')).toBe(1250);
    expect(paymentDraftTotalCents([createPaymentRow({ amountCents: '1250' })])).toBe(1250);
    expect(paymentInputsFromRows([createPaymentRow({ amountCents: '12.50' })])).toEqual([
      { method: 'CASH', amountCents: 1250 },
    ]);
  });

  it('skips invalid rows and omits invalid cash received amounts', () => {
    const rows = [
      createPaymentRow({ amountCents: 'oops' }),
      createPaymentRow({ amountCents: '0.00' }),
      createPaymentRow({ method: 'CASH', amountCents: '7.00', receivedCents: 'abc' }),
    ];

    expect(paymentInputsFromRows(rows)).toEqual([{ method: 'CASH', amountCents: 700 }]);
    expect(validatePaymentRows([rows[2]!], 700)).toBe(
      'O valor recebido em dinheiro deve ser positivo em centavos.',
    );
  });

  it('builds split payment inputs with integer cents and omits received for non-cash', () => {
    const rows = [
      createPaymentRow({ id: 'cash', method: 'CASH', amountCents: '6.00', receivedCents: '10.00' }),
      createPaymentRow({
        id: 'card',
        method: 'DEBIT_CARD',
        amountCents: '9.00',
        receivedCents: '9.00',
      }),
    ];

    expect(paymentDraftTotalCents(rows)).toBe(1500);
    expect(paymentInputsFromRows(rows)).toEqual([
      { method: 'CASH', amountCents: 600, receivedCents: 1000 },
      { method: 'DEBIT_CARD', amountCents: 900 },
    ]);
    expect(validatePaymentRows(rows, 1500)).toBe(
      'Somente pagamentos em dinheiro podem registrar o valor recebido.',
    );
  });

  it('accepts no payments for a zero-total order', () => {
    expect(validatePaymentRows([], 0)).toBeNull();
    expect(paymentInputsFromRows([])).toEqual([]);
  });

  it('accepts an exact split total', () => {
    const rows = [
      createPaymentRow({ id: 'cash', method: 'CASH', amountCents: '6.00' }),
      createPaymentRow({ id: 'pix', method: 'PIX', amountCents: '9.00' }),
    ];

    expect(validatePaymentRows(rows, 1500)).toBeNull();
  });

  it('rejects an empty, invalid, or mismatched payment set', () => {
    expect(validatePaymentRows([], 1500)).toBe('Adicione pelo menos um pagamento.');
    expect(
      validatePaymentRows([createPaymentRow({ amountCents: '0.00' })], 1500),
    ).toBe('Cada pagamento precisa de um valor positivo em centavos.');
    expect(
      validatePaymentRows([createPaymentRow({ amountCents: '10.00' })], 1500),
    ).toBe('Os valores dos pagamentos devem somar o total do pedido.');
    expect(
      validatePaymentRows(
        [createPaymentRow({ method: 'CASH', amountCents: '10.00', receivedCents: '5.00' })],
        1000,
      ),
    ).toBe('O valor recebido não pode ser menor que o pagamento.');
  });
});
