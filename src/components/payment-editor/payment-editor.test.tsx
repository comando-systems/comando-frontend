import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { PaymentEditor } from '@/components/payment-editor';
import { createPaymentRow } from '@/utils/payments';

describe('<PaymentEditor />', () => {
  it('shows only the summary and an add button until a payment is added', async () => {
    await render(<PaymentEditor rows={[]} onRowsChange={jest.fn()} totalCents={1500} />);

    expect(screen.getByTestId('payment-editor-total').props.children).toBe('R$15.00');
    expect(screen.getByTestId('payment-editor-entered').props.children).toBe('R$0.00');
    expect(screen.getByTestId('payment-editor-add')).toBeTruthy();
    expect(screen.queryByTestId('payment-editor-row-0')).toBeNull();
    expect(screen.queryByText('O total dos pagamentos é igual ao total do pedido.')).toBeNull();
    expect(screen.queryByText(/Formas de pagamento disponíveis/)).toBeNull();
  });

  it('adds a first row prefilled with the whole order total in cents', async () => {
    const onRowsChange = jest.fn();

    await render(<PaymentEditor rows={[]} onRowsChange={onRowsChange} totalCents={1500} />);

    await fireEvent.press(screen.getByTestId('payment-editor-add'));

    expect(onRowsChange).toHaveBeenCalledWith([
      expect.objectContaining({ method: 'CASH', amountCents: '1500', receivedCents: '' }),
    ]);
  });

  it('adds later rows prefilled with the remaining amount and removes them', async () => {
    const onRowsChange = jest.fn();
    const rows = [createPaymentRow({ id: 'one', amountCents: '600' })];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    await fireEvent.press(screen.getByTestId('payment-editor-add'));

    expect(onRowsChange).toHaveBeenCalledWith([
      rows[0],
      expect.objectContaining({ amountCents: '900' }),
    ]);

    await render(
      <PaymentEditor
        rows={[rows[0]!, createPaymentRow({ id: 'two', amountCents: '900' })]}
        onRowsChange={onRowsChange}
        totalCents={1500}
      />,
    );

    expect(screen.getByTestId('payment-editor-remove-0').props.accessibilityState.disabled).toBe(
      false,
    );
    await fireEvent.press(screen.getByTestId('payment-editor-remove-1'));
    expect(onRowsChange).toHaveBeenLastCalledWith([rows[0]]);
  });

  it('shows cents in reais and converts typed decimals back to cents', async () => {
    const onRowsChange = jest.fn();
    const rows = [createPaymentRow({ id: 'one', amountCents: '500' })];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    expect(screen.getByTestId('payment-editor-amount-0').props.value).toBe('5.00');
    expect(screen.getByText('O total dos pagamentos é menor que o total do pedido.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '12.50');

    expect(onRowsChange).toHaveBeenCalledWith([
      { id: 'one', method: 'CASH', amountCents: '1250', receivedCents: '' },
    ]);
    expect(screen.getByTestId('payment-editor-amount-0').props.value).toBe('12.50');
  });

  it('formats partial input on blur and follows external row updates', async () => {
    const onRowsChange = jest.fn();
    const rows = [createPaymentRow({ id: 'one', amountCents: '500', receivedCents: '600' })];
    const view = await render(
      <PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />,
    );

    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '12.5');
    await fireEvent(screen.getByTestId('payment-editor-amount-0'), 'blur');
    expect(screen.getByTestId('payment-editor-amount-0').props.value).toBe('12.50');

    await fireEvent.changeText(screen.getByTestId('payment-editor-received-0'), '7.5');
    await fireEvent(screen.getByTestId('payment-editor-received-0'), 'blur');
    expect(screen.getByTestId('payment-editor-received-0').props.value).toBe('7.50');

    await act(async () => {
      view.rerender(
        <PaymentEditor
          rows={[
            createPaymentRow({ id: 'one', amountCents: '900', receivedCents: '1000' }),
          ]}
          onRowsChange={onRowsChange}
          totalCents={1500}
        />,
      );
    });

    expect(view.getByTestId('payment-editor-amount-0').props.value).toBe('9.00');
    expect(view.getByTestId('payment-editor-received-0').props.value).toBe('10.00');
  });

  it('prefills an empty row with the remaining amount when a non-cash method is selected', async () => {
    const onRowsChange = jest.fn();
    const rows = [
      createPaymentRow({ id: 'cash', amountCents: '600' }),
      createPaymentRow({ id: 'card', method: 'CASH', amountCents: '' }),
    ];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    await fireEvent.press(screen.getByTestId('payment-editor-method-1-DEBIT_CARD'));

    expect(onRowsChange).toHaveBeenCalledWith([
      rows[0],
      { id: 'card', method: 'DEBIT_CARD', amountCents: '900', receivedCents: '' },
    ]);
    expect(screen.getByTestId('payment-editor-amount-1').props.value).toBe('9.00');
  });

  it('does not prefill a non-cash row when the order is already fully paid', async () => {
    const onRowsChange = jest.fn();
    const rows = [
      createPaymentRow({ id: 'cash', amountCents: '1500' }),
      createPaymentRow({ id: 'card', amountCents: '' }),
    ];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    await fireEvent.press(screen.getByTestId('payment-editor-method-1-PIX'));

    expect(onRowsChange).toHaveBeenCalledWith([
      rows[0],
      { id: 'card', method: 'PIX', amountCents: '', receivedCents: '' },
    ]);
  });

  it('shows and clears cash received in decimal format', async () => {
    const onRowsChange = jest.fn();
    const rows = [
      createPaymentRow({ id: 'one', amountCents: '1500', receivedCents: '2000' }),
    ];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    expect(screen.getByTestId('payment-editor-received-0').props.value).toBe('20.00');
    expect(screen.getByText('O total dos pagamentos é igual ao total do pedido.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('payment-editor-received-0'), '18.50');

    expect(onRowsChange).toHaveBeenCalledWith([
      { id: 'one', method: 'CASH', amountCents: '1500', receivedCents: '1850' },
    ]);

    await fireEvent.press(screen.getByTestId('payment-editor-method-0-PIX'));

    expect(onRowsChange).toHaveBeenLastCalledWith([
      { id: 'one', method: 'PIX', amountCents: '1500', receivedCents: '' },
    ]);
  });
});
