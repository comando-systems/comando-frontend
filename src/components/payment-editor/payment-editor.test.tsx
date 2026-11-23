import { fireEvent, render, screen } from '@testing-library/react-native';

import { PaymentEditor } from '@/components/payment-editor';
import { createPaymentRow } from '@/utils/payments';

describe('<PaymentEditor />', () => {
  it('shows the order total, entered amount, and matching status', async () => {
    const rows = [createPaymentRow({ id: 'one', amountCents: '1500' })];

    await render(<PaymentEditor rows={rows} onRowsChange={jest.fn()} totalCents={1500} />);

    expect(screen.getByTestId('payment-editor-total').props.children).toBe('R$15.00');
    expect(screen.getByTestId('payment-editor-entered').props.children).toBe('R$15.00');
    expect(screen.getByText('Payment total matches the order total.')).toBeTruthy();
    expect(screen.getByTestId('payment-editor-amount-0').props.value).toBe('1500');
  });

  it('updates a payment amount and warns when the total does not match', async () => {
    const onRowsChange = jest.fn();
    const rows = [createPaymentRow({ id: 'one', amountCents: '500' })];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    expect(screen.getByText('Payment total is below the order total.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '1500');

    expect(onRowsChange).toHaveBeenCalledWith([
      { id: 'one', method: 'CASH', amountCents: '1500', receivedCents: '' },
    ]);
  });

  it('clears received cents when switching away from cash', async () => {
    const onRowsChange = jest.fn();
    const rows = [
      createPaymentRow({ id: 'one', amountCents: '1500', receivedCents: '2000' }),
    ];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    expect(screen.getByTestId('payment-editor-received-0')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('payment-editor-method-0-PIX'));

    expect(onRowsChange).toHaveBeenCalledWith([
      { id: 'one', method: 'PIX', amountCents: '1500', receivedCents: '' },
    ]);
  });

  it('adds and removes payment rows', async () => {
    const onRowsChange = jest.fn();
    const rows = [createPaymentRow({ id: 'one', amountCents: '1500' })];

    await render(<PaymentEditor rows={rows} onRowsChange={onRowsChange} totalCents={1500} />);

    expect(screen.getByTestId('payment-editor-remove-0').props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.press(screen.getByTestId('payment-editor-add'));

    expect(onRowsChange).toHaveBeenCalledWith([
      rows[0],
      expect.objectContaining({ method: 'CASH', amountCents: '', receivedCents: '' }),
    ]);

    await render(
      <PaymentEditor
        rows={[
          rows[0],
          createPaymentRow({ id: 'two', amountCents: '500' }),
        ]}
        onRowsChange={onRowsChange}
        totalCents={1500}
      />,
    );

    await fireEvent.press(screen.getByTestId('payment-editor-remove-1'));

    expect(onRowsChange).toHaveBeenLastCalledWith([rows[0]]);
  });
});
