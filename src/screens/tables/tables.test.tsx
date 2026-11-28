import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Tables from '@/screens/tables';
import type { OrderResponse, PageResponse, RoleCode } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

const createdAt = '2026-01-01T00:00:00.000Z';
const push = jest.fn();

function makeOrder(id: string, tableCode: string, status: OrderResponse['status']): OrderResponse {
  return {
    id,
    type: 'TABLE',
    status,
    tableCode,
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
        quantity: 2,
        unitPriceCents: 500,
        lineTotalCents: 1000,
      },
      {
        itemId: '2',
        itemName: 'Cake',
        quantity: 1,
        unitPriceCents: 500,
        lineTotalCents: 500,
      },
    ],
    payments: [],
  };
}

function makePage(data: readonly OrderResponse[]): PageResponse<OrderResponse> {
  return {
    data,
    pagination: { page: 1, pageSize: 100, total: data.length, totalPages: 1 },
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

describe('<Tables />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(effect, []);
    });
    mockRoles(['SERVER']);
    jest.spyOn(api.orders, 'list').mockResolvedValue(makePage([]));
    jest.spyOn(api.orders, 'openTable').mockResolvedValue(makeOrder('11', 'T-02', 'OPEN'));
  });

  it('lists live table orders and opens the selected order', async () => {
    jest
      .spyOn(api.orders, 'list')
      .mockResolvedValue(makePage([makeOrder('10', 'T-01', 'AWAITING_PAYMENT')]));

    await render(<Tables />);

    expect(await screen.findByTestId('table-order-10')).toBeTruthy();
    expect(screen.getByText('T-01')).toBeTruthy();
    expect(
      within(screen.getByTestId('table-order-status-10')).getByText('Aguardando pagamento'),
    ).toBeTruthy();
    expect(screen.getByText('3 itens')).toBeTruthy();
    expect(screen.getByTestId('table-order-total-10').props.children).toBe('R$15.00');
    expect(api.orders.list).toHaveBeenCalledWith({
      statuses: ['OPEN', 'AWAITING_PAYMENT'],
      type: 'TABLE',
      pageSize: 100,
    });

    await fireEvent.press(screen.getByTestId('table-order-10'));

    expect(push).toHaveBeenCalledWith('/orders/10');
  });

  it('navigates to the existing order when a table is occupied', async () => {
    jest.spyOn(api.orders, 'openTable').mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'TABLE_OCCUPIED',
        details: { orderId: '99' },
      }),
    );

    await render(<Tables />);

    await fireEvent.press(await screen.findByTestId('table-rename-toggle'));
    await fireEvent.changeText(await screen.findByTestId('table-code-input'), 'T-02');
    await fireEvent.press(screen.getByTestId('open-table-button'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/99'));
    expect(api.orders.openTable).toHaveBeenCalledWith({ tableCode: 'T-02' });
    expect(screen.queryByTestId('tables-error')).toBeNull();
  });

  it('opens a free table with a custom name and navigates to the new order', async () => {
    await render(<Tables />);

    await fireEvent.press(await screen.findByTestId('table-rename-toggle'));
    await fireEvent.changeText(await screen.findByTestId('table-code-input'), ' T-02 ');
    await fireEvent.press(screen.getByTestId('open-table-button'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/11'));
    expect(api.orders.openTable).toHaveBeenCalledWith({ tableCode: 'T-02' });
  });

  it('opens the next sequential table in one tap', async () => {
    jest
      .spyOn(api.orders, 'list')
      .mockResolvedValue(makePage([makeOrder('10', 'Mesa 1', 'OPEN')]));

    await render(<Tables />);
    await fireEvent.press(await screen.findByTestId('open-table-button'));

    expect(api.orders.openTable).toHaveBeenCalledWith({ tableCode: 'Mesa 2' });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/11'));
  });

  it('shows the optional rename field only when requested', async () => {
    await render(<Tables />);

    expect(screen.queryByTestId('table-code-input')).toBeNull();
    await fireEvent.press(await screen.findByTestId('table-rename-toggle'));
    expect(screen.getByTestId('table-code-input')).toBeTruthy();
    expect(screen.getByText('Sugerido: Mesa 1. Deixe em branco para usar.')).toBeTruthy();
  });

  it('filters the table grid locally by table name', async () => {
    jest
      .spyOn(api.orders, 'list')
      .mockResolvedValue(
        makePage([makeOrder('10', 'T-01', 'OPEN'), makeOrder('11', 'T-02', 'OPEN')]),
      );

    await render(<Tables />);

    expect(await screen.findByTestId('table-order-10')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('table-search'), 'T-02');

    expect(screen.queryByTestId('table-order-10')).toBeNull();
    expect(screen.getByTestId('table-order-11')).toBeTruthy();
  });

  it('hides the table opener from administrators', async () => {
    mockRoles(['ADMIN']);

    await render(<Tables />);

    expect(await screen.findByTestId('tables-list')).toBeTruthy();
    expect(screen.queryByTestId('open-table-button')).toBeNull();
  });

  it('shows a fixed error when the list cannot be loaded', async () => {
    jest.spyOn(api.orders, 'list').mockRejectedValue(
      new ApiError({ status: 401, code: 'UNAUTHORIZED' }),
    );

    await render(<Tables />);

    expect(await screen.findByTestId('tables-error')).toBeTruthy();
    expect(screen.getByText('É necessário entrar com sua conta.')).toBeTruthy();
  });
});
