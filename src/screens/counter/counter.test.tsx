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

function makeOrder(id: string, tableCode = 'T-02'): OrderResponse {
  return {
    id,
    type: 'TABLE',
    status: 'OPEN',
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
    pagination: { page: 1, pageSize: 100, total: orders.length, totalPages: 1 },
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

async function openExportPanel(): Promise<void> {
  await fireEvent.press(screen.getByTestId('counter-export-button'));
  expect(await screen.findByTestId('counter-export-panel')).toBeTruthy();
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

  it('keeps payments hidden and creates the counter order only after Confirm sale', async () => {
    await render(<Counter />);
    await addCoffee();

    expect(screen.queryByTestId('payment-editor')).toBeNull();
    expect(screen.queryByTestId('counter-confirm-sale-button')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('counter-label-input'), 'Ana');
    await fireEvent.press(screen.getByTestId('counter-finish-button'));

    expect(screen.getByTestId('payment-editor')).toBeTruthy();
    expect(screen.getByTestId('counter-confirm-sale-button')).toBeTruthy();
    expect(api.orders.createCounter).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    expect(screen.getByTestId('payment-editor-amount-0').props.value).toBe('15.00');

    await fireEvent.press(screen.getByTestId('counter-confirm-sale-button'));

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

  it('blocks Finish when the draft is empty', async () => {
    await render(<Counter />);

    await fireEvent.press(await screen.findByTestId('counter-finish-button'));

    expect(screen.getByText('Adicione pelo menos um item para continuar.')).toBeTruthy();
    expect(screen.queryByTestId('payment-editor')).toBeNull();
    expect(api.orders.createCounter).not.toHaveBeenCalled();
  });

  it('blocks Confirm sale when decimal payments do not match the preview total', async () => {
    await render(<Counter />);
    await addCoffee();

    await fireEvent.press(screen.getByTestId('counter-finish-button'));
    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '5.00');
    await fireEvent.press(screen.getByTestId('counter-confirm-sale-button'));

    expect(
      screen.getByText('Os valores dos pagamentos devem somar o total do pedido.'),
    ).toBeTruthy();
    expect(api.orders.createCounter).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('sends split payments as integer cents with decimal inputs', async () => {
    await render(<Counter />);
    await addCoffee();

    await fireEvent.press(screen.getByTestId('counter-finish-button'));
    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    await fireEvent.changeText(screen.getByTestId('payment-editor-amount-0'), '6.00');
    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    expect(screen.getByTestId('payment-editor-amount-1').props.value).toBe('9.00');

    await fireEvent.press(screen.getByTestId('payment-editor-method-1-PIX'));
    await fireEvent.press(screen.getByTestId('counter-confirm-sale-button'));

    await waitFor(() =>
      expect(api.orders.createCounter).toHaveBeenCalledWith(
        expect.objectContaining({
          payments: [
            { method: 'CASH', amountCents: 600 },
            { method: 'PIX', amountCents: 900 },
          ],
        }),
      ),
    );
  });

  it('hides counter sales from a server', async () => {
    mockRoles(['SERVER']);

    await render(<Counter />);

    expect(await screen.findByText('Indisponível')).toBeTruthy();
    expect(screen.queryByTestId('order-builder')).toBeNull();
    expect(screen.queryByTestId('counter-finish-button')).toBeNull();
    expect(screen.queryByTestId('counter-export-button')).toBeNull();
  });

  it('lists open tables and exports to a selected table, discarding all counter data', async () => {
    jest.spyOn(api.orders, 'list').mockResolvedValue(makeOrderPage([makeOrder('20')]));
    jest.spyOn(api.orders, 'addItems').mockResolvedValue(makeOrder('20'));

    await render(<Counter />);
    await addCoffee();
    await fireEvent.changeText(screen.getByTestId('counter-label-input'), 'Ana');
    await openExportPanel();

    await waitFor(() =>
      expect(api.orders.list).toHaveBeenCalledWith({
        statuses: ['OPEN', 'AWAITING_PAYMENT'],
        type: 'TABLE',
        pageSize: 100,
      }),
    );
    expect(screen.getByTestId('counter-export-table-20')).toBeTruthy();
    expect(screen.getByTestId('counter-export-table-NEW')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('counter-export-table-20'));

    await waitFor(() =>
      expect(api.orders.addItems).toHaveBeenCalledWith('20', {
        items: [{ itemId: '1', quantity: 1 }],
      }),
    );
    expect(api.orders.openTable).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/orders/20');
    expect(screen.queryByTestId('counter-export-panel')).toBeNull();
    expect(screen.queryByTestId('payment-editor')).toBeNull();
    expect(screen.getByTestId('counter-total').props.children).toBe('R$0.00');
    expect(screen.getByTestId('counter-label-input').props.value).toBe('');
  });

  it('opens a generated new table before exporting built lines', async () => {
    await render(<Counter />);
    await addCoffee();
    await openExportPanel();
    await fireEvent.press(screen.getByTestId('counter-export-table-NEW'));

    await waitFor(() => expect(api.orders.openTable).toHaveBeenCalledWith({ tableCode: 'Mesa 1' }));
    await waitFor(() =>
      expect(api.orders.addItems).toHaveBeenCalledWith('21', {
        items: [{ itemId: '1', quantity: 1 }],
      }),
    );
    expect(push).toHaveBeenCalledWith('/orders/21');
  });

  it('uses the next free sequential name when opening a new table', async () => {
    jest
      .spyOn(api.orders, 'list')
      .mockResolvedValue(makeOrderPage([makeOrder('20', 'Mesa 1'), makeOrder('22', 'Mesa 2')]));

    await render(<Counter />);
    await addCoffee();
    await openExportPanel();
    await fireEvent.press(screen.getByTestId('counter-export-table-NEW'));

    await waitFor(() => expect(api.orders.openTable).toHaveBeenCalledWith({ tableCode: 'Mesa 3' }));
  });

  it('navigates to the existing order when the generated table is occupied', async () => {
    jest.spyOn(api.orders, 'openTable').mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'TABLE_OCCUPIED',
        details: { orderId: '99' },
      }),
    );

    await render(<Counter />);
    await addCoffee();
    await openExportPanel();
    await fireEvent.press(screen.getByTestId('counter-export-table-NEW'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/99'));
    expect(api.orders.addItems).not.toHaveBeenCalled();
    expect(screen.queryByTestId('counter-error')).toBeNull();
    expect(screen.queryByTestId('counter-export-panel')).toBeNull();
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
    await fireEvent.press(screen.getByTestId('counter-export-button'));

    expect(
      screen.getByText(
        'Alguns produtos não estão mais disponíveis. Atualize o catálogo e tente novamente.',
      ),
    ).toBeTruthy();
    expect(api.orders.list).not.toHaveBeenCalled();
    expect(screen.queryByTestId('counter-export-panel')).toBeNull();
  });

  it('blocks Confirm sale when a built item is no longer in the catalog', async () => {
    let loadCount = 0;
    jest.spyOn(api.items, 'list').mockImplementation(async () => {
      loadCount += 1;
      return makeItemPage(loadCount === 1 ? [coffee] : []);
    });

    await render(<Counter />);
    await addCoffee();

    await fireEvent.press(screen.getByTestId('counter-finish-button'));
    expect(screen.getByTestId('payment-editor')).toBeTruthy();

    await act(async () => {
      focusEffect?.();
    });
    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    await fireEvent.press(screen.getByTestId('counter-confirm-sale-button'));

    expect(
      screen.getByText(
        'Alguns produtos não estão mais disponíveis. Atualize o catálogo e tente novamente.',
      ),
    ).toBeTruthy();
    expect(api.orders.createCounter).not.toHaveBeenCalled();
  });

  it('shows an error when the counter order cannot be created', async () => {
    jest
      .spyOn(api.orders, 'createCounter')
      .mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR' }));

    await render(<Counter />);
    await addCoffee();

    await fireEvent.press(screen.getByTestId('counter-finish-button'));
    await fireEvent.press(screen.getByTestId('payment-editor-add'));
    await fireEvent.press(screen.getByTestId('counter-confirm-sale-button'));

    expect(await screen.findByTestId('counter-error')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a load error and retries the catalog', async () => {
    jest.spyOn(api.items, 'list').mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR' }));

    await render(<Counter />);

    expect(await screen.findByTestId('counter-error')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('counter-error-retry'));
    await waitFor(() => expect(api.items.list).toHaveBeenCalledTimes(2));
  });

  it('shows an error when opening a new table fails', async () => {
    jest
      .spyOn(api.orders, 'openTable')
      .mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR' }));

    await render(<Counter />);
    await addCoffee();
    await openExportPanel();
    await fireEvent.press(screen.getByTestId('counter-export-table-NEW'));

    expect(await screen.findByTestId('counter-error')).toBeTruthy();
    expect(api.orders.addItems).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows an error when adding lines to the chosen table fails', async () => {
    jest
      .spyOn(api.orders, 'addItems')
      .mockRejectedValue(new ApiError({ status: 409, code: 'INVARIANT_VIOLATION' }));
    jest.spyOn(api.orders, 'list').mockResolvedValue(makeOrderPage([makeOrder('20')]));

    await render(<Counter />);
    await addCoffee();
    await openExportPanel();
    await fireEvent.press(screen.getByTestId('counter-export-table-20'));

    expect(await screen.findByTestId('counter-error')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows an error and hides the export panel when tables cannot be loaded', async () => {
    jest.spyOn(api.orders, 'list').mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR' }));

    await render(<Counter />);
    await addCoffee();
    await fireEvent.press(screen.getByTestId('counter-export-button'));

    expect(await screen.findByTestId('counter-error')).toBeTruthy();
    expect(screen.queryByTestId('counter-export-panel')).toBeNull();
  });
});
