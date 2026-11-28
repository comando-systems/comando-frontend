import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Counter from '@/screens/counter';
import type {
  CreateCounterOrderRequest,
  ItemResponse,
  OrderResponse,
  PageResponse,
  RoleCode,
} from '@/types';
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
let focusEffect: (() => void) | null = null;

const coffee: ItemResponse = {
  id: '1',
  name: 'Coffee',
  description: null,
  category: 'Drinks',
  categories: ['Drinks'],
  priceCents: 1500,
  imageUrl: null,
  enabled: true,
  isActive: true,
  createdAt,
  updatedAt: createdAt,
};

function makeItemPage(items: readonly ItemResponse[]): PageResponse<ItemResponse> {
  return {
    data: items,
    pagination: { page: 1, pageSize: 100, total: items.length, totalPages: 1 },
  };
}

function makeOrder(id: string): OrderResponse {
  return {
    id,
    type: 'TABLE',
    status: 'OPEN',
    tableCode: 'T-02',
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
        quantity: 1,
        unitPriceCents: 1500,
        lineTotalCents: 1500,
      },
    ],
    payments: [],
  };
}

function makeOrderPage(orders: readonly OrderResponse[]): PageResponse<OrderResponse> {
  return {
    data: orders,
    pagination: { page: 1, pageSize: 1, total: orders.length, totalPages: 1 },
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

async function addCoffee(): Promise<void> {
  await fireEvent.press(await screen.findByTestId('add-item-1'));
  await waitFor(() => expect(screen.getByTestId('counter-total').props.children).toBe('R$15.00'));
}

async function chooseTableExport(code = 'T-02'): Promise<void> {
  await fireEvent.press(screen.getByTestId('counter-type-TABLE'));
  await fireEvent.changeText(await screen.findByTestId('counter-table-code-input'), code);
}

describe('<Counter />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    focusEffect = null;
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      focusEffect = effect as () => void;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(effect, []);
    });
    mockRoles(['CASHIER']);
    jest.spyOn(api.items, 'list').mockResolvedValue(makeItemPage([coffee]));
    jest.spyOn(api.settings, 'get').mockResolvedValue({
      serviceFeeEnabled: true,
      serviceFeeBasisPoints: 1000,
      updatedAt: createdAt,
    });
    jest.spyOn(api.orders, 'createCounter').mockResolvedValue(makeOrder('10'));
    jest.spyOn(api.orders, 'list').mockResolvedValue(makeOrderPage([]));
    jest.spyOn(api.orders, 'openTable').mockResolvedValue(makeOrder('21'));
    jest.spyOn(api.orders, 'addItems').mockResolvedValue(makeOrder('21'));
  });

  it('creates one closed and paid counter order', async () => {
    await render(<Counter />);
    await addCoffee();

    await fireEvent.changeText(screen.getByTestId('counter-label-input'), 'Ana');
    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '1500');
    await fireEvent.press(screen.getByTestId('counter-finish-button'));

    await waitFor(() =>
      expect(api.orders.createCounter).toHaveBeenCalledWith({
        items: [{ itemId: '1', quantity: 1 }],
        payments: [{ method: 'CASH', amountCents: 1500 }],
        label: 'Ana',
        surchargeCents: 0,
        discountCents: 0,
        applyServiceFee: false,
      } satisfies CreateCounterOrderRequest),
    );
    expect(push).toHaveBeenCalledWith('/orders/10');
  });

  it('blocks a sale when payments do not match the preview total', async () => {
    await render(<Counter />);
    await addCoffee();

    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '500');
    await fireEvent.press(screen.getByTestId('counter-finish-button'));

    expect(screen.getByText('Payment amounts must equal the order total.')).toBeTruthy();
    expect(api.orders.createCounter).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('hides counter sales from a server', async () => {
    mockRoles(['SERVER']);

    await render(<Counter />);

    expect(await screen.findByText('Not available')).toBeTruthy();
    expect(screen.queryByTestId('order-builder')).toBeNull();
    expect(screen.queryByTestId('counter-finish-button')).toBeNull();
  });

  it('reuses an existing open table order when exporting', async () => {
    jest.spyOn(api.orders, 'list').mockResolvedValue(makeOrderPage([makeOrder('20')]));
    jest.spyOn(api.orders, 'addItems').mockResolvedValue(makeOrder('20'));

    await render(<Counter />);
    await addCoffee();
    await chooseTableExport(' T-02 ');
    await fireEvent.press(screen.getByTestId('counter-export-button'));

    await waitFor(() =>
      expect(api.orders.list).toHaveBeenCalledWith({
        tableCode: 'T-02',
        status: 'OPEN',
        type: 'TABLE',
        pageSize: 1,
      }),
    );
    expect(api.orders.openTable).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(api.orders.addItems).toHaveBeenCalledWith('20', {
        items: [{ itemId: '1', quantity: 1 }],
      }),
    );
    expect(push).toHaveBeenCalledWith('/orders/20');
  });

  it('opens a free table before exporting built lines', async () => {
    await render(<Counter />);
    await addCoffee();
    await chooseTableExport();
    await fireEvent.press(screen.getByTestId('counter-export-button'));

    await waitFor(() => expect(api.orders.openTable).toHaveBeenCalledWith({ tableCode: 'T-02' }));
    await waitFor(() =>
      expect(api.orders.addItems).toHaveBeenCalledWith('21', {
        items: [{ itemId: '1', quantity: 1 }],
      }),
    );
    expect(push).toHaveBeenCalledWith('/orders/21');
  });

  it('navigates to the existing order when the export table is occupied', async () => {
    jest.spyOn(api.orders, 'openTable').mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'TABLE_OCCUPIED',
        details: { orderId: '99' },
      }),
    );

    await render(<Counter />);
    await addCoffee();
    await chooseTableExport();
    await fireEvent.press(screen.getByTestId('counter-export-button'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/99'));
    expect(api.orders.addItems).not.toHaveBeenCalled();
    expect(screen.queryByTestId('counter-error')).toBeNull();
  });

  it('blocks export when a built item is no longer in the catalog', async () => {
    let loadCount = 0;
    jest.spyOn(api.items, 'list').mockImplementation(async () => {
      loadCount += 1;
      return makeItemPage(loadCount === 1 ? [coffee] : []);
    });

    await render(<Counter />);
    await addCoffee();
    await act(async () => {
      focusEffect?.();
    });
    await chooseTableExport();
    await fireEvent.press(screen.getByTestId('counter-export-button'));

    expect(
      screen.getByText('Some items are no longer available. Refresh the catalog and try again.'),
    ).toBeTruthy();
    expect(api.orders.addItems).not.toHaveBeenCalled();
  });
});
