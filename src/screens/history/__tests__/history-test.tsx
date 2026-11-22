import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import History from '@/screens/history';
import type {
  OrderListParams,
  OrderResponse,
  OrderStatus,
  OrderType,
  PageResponse,
  RoleCode,
} from '@/types';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

const createdAt = '2026-01-15T12:00:00.000Z';
const push = jest.fn();

function makeOrder(
  id: string,
  options: {
    readonly status?: OrderStatus;
    readonly type?: OrderType;
    readonly tableCode?: string | null;
    readonly totalCents?: number;
  } = {},
): OrderResponse {
  const {
    status = 'CLOSED',
    type = 'TABLE',
    tableCode = 'T-01',
    totalCents = 1500,
  } = options;

  return {
    id,
    type,
    status,
    tableCode,
    label: null,
    openedByUserId: 'user-1',
    closedByUserId: null,
    canceledByUserId: null,
    paymentRequestedByUserId: null,
    paymentRequestedAt: null,
    openedAt: createdAt,
    closedAt: status === 'CLOSED' ? createdAt : null,
    canceledAt: status === 'CANCELED' ? createdAt : null,
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
        quantity: 1,
        unitPriceCents: totalCents,
        lineTotalCents: totalCents,
      },
    ],
    payments: [],
  };
}

function makePage(
  data: readonly OrderResponse[],
  page: number,
  totalPages: number,
  total = data.length,
): PageResponse<OrderResponse> {
  return {
    data,
    pagination: { page, pageSize: 20, total, totalPages },
  };
}

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
  } as unknown as ReturnType<typeof useSession>);
}

describe('<History />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      useEffect(() => {
        effect();
      }, [effect]);
    });
    mockRoles(['CASHIER']);
    jest.spyOn(api.orders, 'list').mockResolvedValue(makePage([], 1, 0, 0));
  });

  it('sends filters as supported query parameters with ISO 8601 UTC dates', async () => {
    await render(<History />);

    expect(api.orders.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });

    await fireEvent.press(screen.getByTestId('history-status-CLOSED'));
    await fireEvent.press(screen.getByTestId('history-type-TABLE'));
    await fireEvent.changeText(screen.getByTestId('history-table-code'), ' T-02 ');
    await fireEvent.changeText(screen.getByTestId('history-from'), '2026-01-01');
    await fireEvent.changeText(screen.getByTestId('history-to'), '2026-01-31');
    await fireEvent.press(screen.getByTestId('history-apply'));

    await waitFor(() =>
      expect(api.orders.list).toHaveBeenLastCalledWith({
        status: 'CLOSED',
        type: 'TABLE',
        tableCode: 'T-02',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
        page: 1,
        pageSize: 20,
      } satisfies OrderListParams),
    );
  });

  it('loads another page and keeps navigation controls in sync', async () => {
    const firstOrder = makeOrder('10');
    const secondOrder = makeOrder('11', { tableCode: 'T-02', totalCents: 900 });
    jest.spyOn(api.orders, 'list').mockImplementation(async (query) => {
      if (query?.page === 2) {
        return makePage([secondOrder], 2, 2, 2);
      }

      return makePage([firstOrder], 1, 2, 2);
    });

    await render(<History />);

    expect(await screen.findByTestId('history-order-10')).toBeTruthy();
    expect(screen.getByTestId('history-previous').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('history-next').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByTestId('history-result-count').props.children).toBe('Showing 2 orders');
    expect(screen.getByTestId('history-page-revenue').props.children).toBe('R$15.00');

    await fireEvent.press(screen.getByTestId('history-next'));

    await waitFor(() =>
      expect(api.orders.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }),
    );
    expect(await screen.findByTestId('history-order-11')).toBeTruthy();
    expect(screen.getByTestId('history-page-label').props.children).toBe('Page 2 of 2');
    expect(screen.getByTestId('history-previous').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByTestId('history-next').props.accessibilityState.disabled).toBe(true);
  });

  it('shows a stable empty state with a single available page', async () => {
    await render(<History />);

    expect(await screen.findByText('No orders found')).toBeTruthy();
    expect(screen.getByTestId('history-result-count').props.children).toBe('Showing 0 orders');
    expect(screen.getByTestId('history-closed-count').props.children).toBe(0);
    expect(screen.getByTestId('history-page-revenue').props.children).toBe('R$0.00');
    expect(screen.getByTestId('history-page-label').props.children).toBe('Page 1 of 1');
    expect(screen.getByTestId('history-next').props.accessibilityState.disabled).toBe(true);
  });

  it('opens order details for a role that can read history', async () => {
    jest
      .spyOn(api.orders, 'list')
      .mockResolvedValue(makePage([makeOrder('10')], 1, 1, 1));

    await render(<History />);

    await fireEvent.press(await screen.findByTestId('history-order-10'));

    expect(push).toHaveBeenCalledWith('/orders/10');
  });

  it('blocks history access and requests for a server', async () => {
    mockRoles(['SERVER']);

    await render(<History />);

    expect(await screen.findByText('Not available')).toBeTruthy();
    expect(screen.queryByTestId('history-list')).toBeNull();
    expect(api.orders.list).not.toHaveBeenCalled();
  });

  it('rejects an invalid date range without another request', async () => {
    await render(<History />);

    expect(api.orders.list).toHaveBeenCalledTimes(1);

    await fireEvent.changeText(screen.getByTestId('history-from'), '2026-02-03');
    await fireEvent.changeText(screen.getByTestId('history-to'), '2026-02-02');
    await fireEvent.press(screen.getByTestId('history-apply'));

    expect(screen.getByText('The start date must be before the end date.')).toBeTruthy();
    expect(api.orders.list).toHaveBeenCalledTimes(1);
  });

  it('shows a fixed English error when the request fails', async () => {
    jest.spyOn(api.orders, 'list').mockRejectedValue(new Error('Unexpected failure'));

    await render(<History />);

    expect(await screen.findByTestId('history-error')).toBeTruthy();
    expect(screen.queryByText('Unexpected failure')).toBeNull();
  });
});
