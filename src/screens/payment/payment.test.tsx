import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Payment from '@/screens/payment';
import type { OrderPaymentResponse, OrderResponse, RoleCode } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

const createdAt = '2026-01-01T00:00:00.000Z';
const back = jest.fn();
const push = jest.fn();

interface OrderOptions {
  readonly status?: OrderResponse['status'];
  readonly totalCents?: number;
  readonly payments?: readonly OrderPaymentResponse[];
}

function makeOrder({
  status = 'OPEN',
  totalCents = 1500,
  payments = [],
}: OrderOptions = {}): OrderResponse {
  return {
    id: '10',
    type: 'TABLE',
    status,
    tableCode: 'T-01',
    originalTableCode: 'T-01',
    label: null,
    openedByUserId: 'user-1',
    closedByUserId: null,
    canceledByUserId: null,
    paymentRequestedByUserId: null,
    paymentRequestedAt: null,
    openedAt: createdAt,
    closedAt: null,
    canceledAt: null,
    createdAt,
    updatedAt: createdAt,
    version: 1,
    applyServiceFee: false,
    serviceFeeBasisPoints: 0,
    subtotalCents: totalCents,
    surchargeCents: 0,
    discountCents: 0,
    serviceFeeCents: 0,
    totalCents,
    items: [
      {
        itemId: '1',
        itemName: 'Coffee',
        quantity: 3,
        unitPriceCents: totalCents / 3,
        lineTotalCents: totalCents,
      },
    ],
    payments,
  };
}

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: toRoleSet(roles),
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
  } as unknown as ReturnType<typeof useSession>);
}

describe('<Payment />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ back, push } as unknown as ReturnType<
      typeof useRouter
    >);
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: '10' } as ReturnType<
      typeof useLocalSearchParams
    >);
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(effect, []);
    });
    mockRoles(['CASHIER']);
    jest.spyOn(api.orders, 'get').mockResolvedValue(makeOrder());
    jest.spyOn(api.orders, 'close').mockResolvedValue(makeOrder({ status: 'CLOSED' }));
    jest
      .spyOn(api.orders, 'requestPayment')
      .mockResolvedValue(makeOrder({ status: 'AWAITING_PAYMENT' }));
    jest.spyOn(api.orders, 'reopen').mockResolvedValue(makeOrder());
    jest.spyOn(api.orders, 'cancel').mockResolvedValue(makeOrder({ status: 'CANCELED' }));
  });

  it('starts with the order total in decimal currency format', async () => {
    await render(<Payment />);

    expect(await screen.findByTestId('payment-editor-amount-0')).toBeTruthy();
    expect(screen.getByTestId('payment-editor-amount-0').props.value).toBe('15.00');
  });

  it('closes an order with an exact split payment and navigates back', async () => {
    await render(<Payment />);

    expect(await screen.findByTestId('payment-editor')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '6.00');
    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    await fireEvent.press(screen.getByTestId('payment-editor-method-1-DEBIT_CARD'));
    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-1'), '9.00');

    await fireEvent.press(screen.getByTestId('payment-close-button'));

    await waitFor(() =>
      expect(api.orders.close).toHaveBeenCalledWith('10', {
        payments: [
          { method: 'CASH', amountCents: 600 },
          { method: 'DEBIT_CARD', amountCents: 900 },
        ],
      }),
    );
    expect(back).toHaveBeenCalled();
  });

  it('blocks a close when the payment total does not match the order total', async () => {
    await render(<Payment />);

    await fireEvent.changeText(await screen.findByTestId('payment-editor-amount-0'), '10.00');
    await fireEvent.press(screen.getByTestId('payment-close-button'));

    expect(
      screen.getByText('Os valores dos pagamentos devem somar o total do pedido.'),
    ).toBeTruthy();
    expect(api.orders.close).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });

  it('allows servers to close and hand over their own tables', async () => {
    mockRoles(['SERVER']);

    await render(<Payment />);

    expect(await screen.findByTestId('payment-order-summary')).toBeTruthy();
    expect(screen.getByTestId('payment-editor')).toBeTruthy();
    expect(screen.getByTestId('payment-close-button')).toBeTruthy();
    expect(screen.getByTestId('payment-request-button')).toBeTruthy();
    expect(screen.getByTestId('payment-cancel-button')).toBeTruthy();
    expect(screen.queryByTestId('payment-close-restricted')).toBeNull();
  });

  it('hides all order actions from an administrator', async () => {
    mockRoles(['ADMIN']);

    await render(<Payment />);

    expect(await screen.findByTestId('payment-order-summary')).toBeTruthy();
    expect(screen.queryByTestId('payment-editor')).toBeNull();
    expect(screen.queryByTestId('payment-close-button')).toBeNull();
    expect(screen.queryByTestId('payment-request-button')).toBeNull();
    expect(screen.queryByTestId('payment-reopen-button')).toBeNull();
    expect(screen.queryByTestId('payment-cancel-button')).toBeNull();
  });

  it('saves an order for later payment and reopens it', async () => {
    mockRoles(['SERVER']);

    await render(<Payment />);

    await fireEvent.press(await screen.findByTestId('payment-request-button'));

    await waitFor(() => expect(api.orders.requestPayment).toHaveBeenCalledWith('10'));
    await waitFor(() => expect(screen.getByText('Aguardando pagamento')).toBeTruthy());
    expect(screen.getByTestId('payment-saved-later')).toBeTruthy();

    jest.spyOn(api.orders, 'get').mockResolvedValue(makeOrder({ status: 'AWAITING_PAYMENT' }));
    await fireEvent.press(screen.getByTestId('payment-reopen-button'));

    await waitFor(() => expect(api.orders.reopen).toHaveBeenCalledWith('10'));
    await waitFor(() => expect(screen.getByText('Aberto')).toBeTruthy());
  });

  it('blocks a zero-total order with the ZERO_TOTAL message', async () => {
    jest.spyOn(api.orders, 'get').mockResolvedValue(makeOrder({ totalCents: 0 }));

    await render(<Payment />);

    expect(await screen.findByTestId('payment-editor')).toBeTruthy();
    expect(screen.queryByTestId('payment-editor-amount-0')).toBeNull();

    await fireEvent.press(screen.getByTestId('payment-close-button'));

    await waitFor(() =>
      expect(screen.getByText(/O total do pedido não pode ser zero/)).toBeTruthy(),
    );
    expect(api.orders.close).not.toHaveBeenCalled();
  });

  it('blocks a negative balance with the NEGATIVE_TOTAL message', async () => {
    jest.spyOn(api.orders, 'get').mockResolvedValue(makeOrder({ totalCents: -500 }));

    await render(<Payment />);

    expect(await screen.findByTestId('payment-editor')).toBeTruthy();
    expect(screen.queryByTestId('payment-editor-amount-0')).toBeNull();
    expect(screen.getByText(/Não é possível finalizar com saldo negativo/)).toBeTruthy();
    expect(screen.getByTestId('payment-editor-add').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('payment-close-button'));

    await waitFor(() => expect(screen.getByTestId('payment-error')).toBeTruthy());
    expect(api.orders.close).not.toHaveBeenCalled();
  });

  it('shows an error state when the order cannot be loaded', async () => {
    jest.spyOn(api.orders, 'get').mockRejectedValue(new ApiError({ status: 404, code: 'NOT_FOUND' }));

    await render(<Payment />);

    expect(await screen.findByText('Pedido não encontrado')).toBeTruthy();
    expect(screen.getByTestId('payment-error')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('empty-state-action'));
    expect(push).toHaveBeenCalledWith('/tables');

    await fireEvent.press(screen.getByTestId('payment-error-retry'));

    await waitFor(() => expect(api.orders.get).toHaveBeenCalledTimes(2));
  });

  it('keeps the order open when closing fails', async () => {
    jest
      .spyOn(api.orders, 'close')
      .mockRejectedValue(new ApiError({ status: 409, code: 'INVALID_STATE_TRANSITION' }));

    await render(<Payment />);

    await fireEvent.press(await screen.findByTestId('payment-close-button'));

    expect(await screen.findByTestId('payment-error')).toBeTruthy();
    expect(back).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('payment-error-retry'));
    await waitFor(() => expect(api.orders.get).toHaveBeenCalledTimes(2));
  });

  it('cancels an order and navigates back', async () => {
    await render(<Payment />);

    await fireEvent.press(await screen.findByTestId('payment-cancel-button'));

    await waitFor(() => expect(api.orders.cancel).toHaveBeenCalledWith('10'));
    expect(back).toHaveBeenCalled();
  });

  it('navigates back from the back button', async () => {
    await render(<Payment />);

    await fireEvent.press(await screen.findByTestId('payment-back-button'));

    expect(back).toHaveBeenCalled();
  });

  it('displays the backend-derived change for recorded cash payments', async () => {
    jest.spyOn(api.orders, 'get').mockResolvedValue(
      makeOrder({
        status: 'CLOSED',
        payments: [
          { method: 'CASH', amountCents: 1500, receivedCents: 2000, changeCents: 500 },
        ],
      }),
    );

    await render(<Payment />);

    expect(await screen.findByTestId('recorded-payments')).toBeTruthy();
    expect(screen.getByTestId('recorded-change-0').props.children).toBe('R$5.00');
    expect(screen.queryByTestId('payment-editor')).toBeNull();
  });
});
