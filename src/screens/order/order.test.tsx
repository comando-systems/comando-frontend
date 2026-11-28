import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import Order from '@/screens/order';
import type { ItemResponse, OrderResponse, PageResponse, RoleCode } from '@/types';
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
const push = jest.fn();
const back = jest.fn();

function makeOrder(status: OrderResponse['status'] = 'OPEN'): OrderResponse {
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
    subtotalCents: 1500,
    surchargeCents: 0,
    discountCents: 0,
    serviceFeeCents: 0,
    totalCents: 1500,
    items: [
      {
        itemId: '1',
        itemName: 'Coffee',
        quantity: 3,
        unitPriceCents: 500,
        lineTotalCents: 1500,
      },
    ],
    payments: [],
  };
}

const coffee: ItemResponse = {
  id: '1',
  name: 'Coffee',
  description: null,
  category: 'Drinks',
  categories: ['Drinks'],
  priceCents: 500,
  imageUrl: null,
  enabled: true,
  isActive: true,
  createdAt,
  updatedAt: createdAt,
};

function makeItemPage(): PageResponse<ItemResponse> {
  return {
    data: [coffee],
    pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
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

describe('<Order />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({
      push,
      back,
    } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: '10' } as ReturnType<
      typeof useLocalSearchParams
    >);
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(effect, []);
    });
    mockRoles(['SERVER']);
    jest.spyOn(api.orders, 'get').mockResolvedValue(makeOrder());
    jest.spyOn(api.items, 'list').mockResolvedValue(makeItemPage());
    jest.spyOn(api.settings, 'get').mockResolvedValue({
      serviceFeeEnabled: true,
      serviceFeeBasisPoints: 1000,
      updatedAt: createdAt,
    });
    jest.spyOn(api.orders, 'requestPayment').mockResolvedValue(
      makeOrder('AWAITING_PAYMENT'),
    );
    jest.spyOn(api.orders, 'cancel').mockResolvedValue(makeOrder('CANCELED'));
  });

  it('shows server totals and operational actions for a server', async () => {
    await render(<Order />);

    expect(await screen.findByTestId('order-summary')).toBeTruthy();
    expect(screen.getByTestId('order-total').props.children).toBe('R$15.00');
    expect(screen.getByTestId('order-item-count').props.children).toBe('3 itens');
    expect(screen.getByText('Aberto')).toBeTruthy();
    expect(screen.getByTestId('request-payment-button')).toBeTruthy();
    expect(screen.queryByTestId('order-payment-button')).toBeNull();
    expect(screen.getByTestId('cancel-order-button')).toBeTruthy();
    expect(await screen.findByTestId('builder-line-1')).toBeTruthy();
    expect(screen.getByTestId('line-stepper-1-increase')).toBeTruthy();
  });

  it('locks lines and hides request payment while awaiting payment', async () => {
    jest.spyOn(api.orders, 'get').mockResolvedValue(makeOrder('AWAITING_PAYMENT'));

    await render(<Order />);

    expect(await screen.findByTestId('order-summary')).toBeTruthy();
    expect(screen.getByText('Aguardando pagamento')).toBeTruthy();
    expect(
      screen.getByText('Os itens estão bloqueados enquanto o pagamento é solicitado.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('line-stepper-1-increase')).toBeNull();
    expect(screen.getByTestId('line-quantity-1')).toBeTruthy();
    expect(screen.queryByTestId('request-payment-button')).toBeNull();
    expect(screen.getByTestId('cancel-order-button')).toBeTruthy();
  });

  it('opens payment for a cashier', async () => {
    mockRoles(['CASHIER']);

    await render(<Order />);

    await fireEvent.press(await screen.findByTestId('order-payment-button'));

    expect(push).toHaveBeenCalledWith('/orders/10/payment');
  });

  it('hides table editing and request-payment actions from administrators', async () => {
    mockRoles(['ADMIN']);

    await render(<Order />);

    expect(await screen.findByTestId('order-summary')).toBeTruthy();
    expect(screen.queryByTestId('line-stepper-1-increase')).toBeNull();
    expect(screen.getByTestId('line-quantity-1')).toBeTruthy();
    expect(screen.queryByTestId('request-payment-button')).toBeNull();
    expect(screen.getByTestId('order-payment-button')).toBeTruthy();
    expect(screen.getByTestId('cancel-order-button')).toBeTruthy();
  });

  it('refreshes the order from the response after a line mutation', async () => {
    const updatedOrder: OrderResponse = {
      ...makeOrder(),
      subtotalCents: 2000,
      totalCents: 2000,
      items: [
        {
          itemId: '1',
          itemName: 'Coffee',
          quantity: 4,
          unitPriceCents: 500,
          lineTotalCents: 2000,
        },
      ],
    };
    jest.spyOn(api.orders, 'changeQuantity').mockResolvedValue(updatedOrder);

    await render(<Order />);

    await fireEvent.press(await screen.findByTestId('line-stepper-1-increase'));

    await waitFor(() =>
      expect(api.orders.changeQuantity).toHaveBeenCalledWith('10', '1', { quantity: 4 }),
    );
    await waitFor(() => expect(screen.getByTestId('order-total').props.children).toBe('R$20.00'));
    expect(screen.getByTestId('order-item-count').props.children).toBe('4 itens');
  });

  it('refreshes the order after request payment and cancel actions', async () => {
    await render(<Order />);

    await fireEvent.press(await screen.findByTestId('request-payment-button'));

    await waitFor(() => expect(api.orders.requestPayment).toHaveBeenCalledWith('10'));
    await waitFor(() => expect(screen.getByText('Aguardando pagamento')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('cancel-order-button'));

    await waitFor(() => expect(api.orders.cancel).toHaveBeenCalledWith('10'));
    await waitFor(() => expect(screen.getByText('Cancelado')).toBeTruthy());
  });

  it('accepts an array route parameter', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: ['10', '11'] } as ReturnType<
      typeof useLocalSearchParams
    >);

    await render(<Order />);

    expect(await screen.findByTestId('order-summary')).toBeTruthy();
    expect(api.orders.get).toHaveBeenCalledWith('10');
  });

  it('shows a load error and retries with a fixed message', async () => {
    jest
      .spyOn(api.orders, 'get')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(makeOrder());

    await render(<Order />);

    expect(await screen.findByText('Algo deu errado. Tente novamente.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('order-error-retry'));

    await waitFor(() => expect(screen.queryByTestId('order-error')).toBeNull());
    expect(await screen.findByTestId('order-summary')).toBeTruthy();
  });

  it('shows an action error without clearing the loaded order', async () => {
    jest.spyOn(api.orders, 'requestPayment').mockRejectedValue(new Error('offline'));

    await render(<Order />);
    await fireEvent.press(await screen.findByTestId('request-payment-button'));

    expect(await screen.findByText('Algo deu errado. Tente novamente.')).toBeTruthy();
    expect(screen.getByTestId('order-summary')).toBeTruthy();
  });

  it('offers a way back when the route has no order id', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: '' } as ReturnType<
      typeof useLocalSearchParams
    >);

    await render(<Order />);

    expect(await screen.findByText('Pedido não encontrado')).toBeTruthy();
    await fireEvent.press(screen.getByText('Voltar às mesas'));

    expect(push).toHaveBeenCalledWith('/tables');
    expect(api.orders.get).toHaveBeenCalledWith('');
  });
});
