import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { EMPTY_ORDER_DRAFT, OrderBuilder } from '@/components/order-builder';
import { api } from '@/services/api';
import type { ItemResponse, OrderResponse, SettingsResponse } from '@/types';

jest.mock('@/services/api', () => ({
  api: {
    orders: {
      addItems: jest.fn(),
      changeQuantity: jest.fn(),
      removeItem: jest.fn(),
      setPricing: jest.fn(),
    },
  },
  ApiError: class ApiError extends Error {},
  getErrorMessage: jest.fn(() => 'The request could not be completed.'),
}));

const addItemsMock = api.orders.addItems as jest.MockedFunction<typeof api.orders.addItems>;
const changeQuantityMock = api.orders.changeQuantity as jest.MockedFunction<
  typeof api.orders.changeQuantity
>;
const removeItemMock = api.orders.removeItem as jest.MockedFunction<typeof api.orders.removeItem>;
const setPricingMock = api.orders.setPricing as jest.MockedFunction<typeof api.orders.setPricing>;

const createdAt = '2026-01-01T00:00:00.000Z';

function makeItem(overrides: Partial<ItemResponse> = {}): ItemResponse {
  return {
    id: '1',
    name: 'Coffee',
    description: null,
    category: 'Drinks',
    priceCents: 500,
    imageUrl: null,
    enabled: true,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: '10',
    type: 'TABLE',
    status: 'OPEN',
    tableCode: 'T-01',
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
    subtotalCents: 0,
    surchargeCents: 0,
    discountCents: 0,
    serviceFeeCents: 0,
    totalCents: 0,
    items: [],
    payments: [],
    ...overrides,
  };
}

function orderWithCoffee(quantity: number): OrderResponse {
  const subtotalCents = 500 * quantity;

  return makeOrder({
    items: [
      {
        itemId: '1',
        itemName: 'Coffee',
        quantity,
        unitPriceCents: 500,
        lineTotalCents: subtotalCents,
      },
    ],
    subtotalCents,
    totalCents: subtotalCents,
  });
}

const catalog: readonly ItemResponse[] = [
  makeItem(),
  makeItem({
    id: '2',
    name: 'Cake',
    category: 'Desserts',
    priceCents: 1250,
  }),
];

const settings: SettingsResponse = {
  serviceFeeEnabled: true,
  serviceFeeBasisPoints: 1000,
  updatedAt: createdAt,
};

describe('<OrderBuilder />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addItemsMock.mockResolvedValue(orderWithCoffee(1));
    changeQuantityMock.mockResolvedValue(orderWithCoffee(2));
    removeItemMock.mockResolvedValue(makeOrder());
    setPricingMock.mockResolvedValue(makeOrder());
  });

  it('adds, increments, decreases, and removes one line per item', async () => {
    function DraftHarness() {
      const [draft, setDraft] = useState(EMPTY_ORDER_DRAFT);

      return (
        <OrderBuilder
          mode="draft"
          draft={draft}
          onDraftChange={setDraft}
          catalog={catalog}
        />
      );
    }

    await render(<DraftHarness />);

    await fireEvent.press(await screen.findByTestId('add-item-1'));
    expect(await screen.findByTestId('builder-line-1')).toBeTruthy();
    expect(screen.getByTestId('catalog-stepper-1-value').props.children).toBe(1);

    await fireEvent.press(screen.getByTestId('catalog-stepper-1-increase'));
    expect(screen.getByTestId('line-stepper-1-value').props.children).toBe(2);
    expect(screen.getByTestId('line-total-1').props.children).toBe('R$10.00');

    await fireEvent.press(screen.getByTestId('line-stepper-1-decrease'));
    expect(screen.getByTestId('line-stepper-1-value').props.children).toBe(1);

    await fireEvent.press(screen.getByTestId('remove-1'));

    await waitFor(() => expect(screen.queryByTestId('builder-line-1')).toBeNull());
    expect(await screen.findByTestId('add-item-1')).toBeTruthy();
  });

  it('filters the catalog and hides disabled or removed items', async () => {
    await render(
      <OrderBuilder
        mode="draft"
        draft={EMPTY_ORDER_DRAFT}
        onDraftChange={jest.fn()}
        catalog={[
          ...catalog,
          makeItem({ id: '3', name: 'Old tea', enabled: false }),
          makeItem({ id: '4', name: 'Removed cake', isActive: false }),
        ]}
      />,
    );

    expect(await screen.findByTestId('add-item-1')).toBeTruthy();
    expect(screen.getByTestId('add-item-2')).toBeTruthy();
    expect(screen.queryByTestId('add-item-3')).toBeNull();
    expect(screen.queryByTestId('add-item-4')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('catalog-search'), 'cake');

    expect(screen.queryByTestId('add-item-1')).toBeNull();
    expect(screen.getByTestId('add-item-2')).toBeTruthy();
  });

  it('previews pricing with the backend rounding rule', async () => {
    const onDraftChange = jest.fn();

    await render(
      <OrderBuilder
        mode="draft"
        draft={{ ...EMPTY_ORDER_DRAFT, items: [{ itemId: '1', quantity: 2 }] }}
        onDraftChange={onDraftChange}
        catalog={catalog}
        settings={settings}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('surcharge-input'), '500');
    await fireEvent.changeText(screen.getByTestId('discount-input'), '200');
    await fireEvent.press(screen.getByTestId('service-fee-segment-on'));
    await fireEvent.press(screen.getByTestId('apply-pricing-button'));

    expect(screen.getByTestId('preview-subtotal').props.children).toBe('R$10.00');
    expect(screen.getByTestId('preview-surcharge').props.children).toBe('R$5.00');
    expect(screen.getByTestId('preview-discount').props.children).toBe('-R$2.00');
    expect(screen.getByTestId('preview-fee').props.children).toBe('R$1.30');
    expect(screen.getByTestId('preview-total').props.children).toBe('R$14.30');
    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        surchargeCents: 500,
        discountCents: 200,
        applyServiceFee: true,
      }),
    );
  });

  it('clamps an invalid discount before submitting it', async () => {
    const onDraftChange = jest.fn();

    await render(
      <OrderBuilder
        mode="draft"
        draft={{ ...EMPTY_ORDER_DRAFT, items: [{ itemId: '1', quantity: 2 }] }}
        onDraftChange={onDraftChange}
        catalog={catalog}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('discount-input'), '9999');
    await fireEvent.press(screen.getByTestId('apply-pricing-button'));

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({ discountCents: 1000 }),
    );
    expect(screen.getByTestId('preview-discount').props.children).toBe('-R$10.00');
    expect(screen.getByTestId('preview-total').props.children).toBe('R$0.00');
  });

  it('adds table items immediately and refreshes the returned order', async () => {
    const refreshedOrder = orderWithCoffee(1);
    addItemsMock.mockResolvedValue(refreshedOrder);

    function OrderHarness() {
      const [order, setOrder] = useState(makeOrder());

      return (
        <OrderBuilder
          mode="order"
          order={order}
          onOrderChange={setOrder}
          catalog={catalog}
        />
      );
    }

    await render(<OrderHarness />);

    await fireEvent.press(await screen.findByTestId('add-item-1'));

    await waitFor(() =>
      expect(addItemsMock).toHaveBeenCalledWith('10', { items: [{ itemId: '1', quantity: 1 }] }),
    );
    expect(await screen.findByTestId('builder-line-1')).toBeTruthy();
    expect(screen.getByTestId('preview-total').props.children).toBe('R$5.00');
  });

  it('sends table quantity changes and item removal immediately', async () => {
    function OrderHarness() {
      const [order, setOrder] = useState(orderWithCoffee(1));

      return (
        <OrderBuilder
          mode="order"
          order={order}
          onOrderChange={setOrder}
          catalog={catalog}
        />
      );
    }

    await render(<OrderHarness />);

    await fireEvent.press(await screen.findByTestId('line-stepper-1-increase'));

    await waitFor(() =>
      expect(changeQuantityMock).toHaveBeenCalledWith('10', '1', { quantity: 2 }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('line-stepper-1-value').props.children).toBe(2),
    );

    await fireEvent.press(screen.getByTestId('remove-1'));

    await waitFor(() => expect(removeItemMock).toHaveBeenCalledWith('10', '1'));
    await waitFor(() => expect(screen.queryByTestId('builder-line-1')).toBeNull());
  });

  it('submits clamped pricing for table orders and uses the returned snapshot', async () => {
    setPricingMock.mockResolvedValue(
      makeOrder({
        applyServiceFee: true,
        serviceFeeBasisPoints: 1000,
        subtotalCents: 1000,
        surchargeCents: 500,
        discountCents: 200,
        serviceFeeCents: 130,
        totalCents: 1430,
        items: orderWithCoffee(2).items,
      }),
    );

    function OrderHarness() {
      const [order, setOrder] = useState(orderWithCoffee(2));

      return (
        <OrderBuilder
          mode="order"
          order={order}
          onOrderChange={setOrder}
          catalog={catalog}
          settings={settings}
        />
      );
    }

    await render(<OrderHarness />);

    await fireEvent.changeText(screen.getByTestId('surcharge-input'), '500');
    await fireEvent.changeText(screen.getByTestId('discount-input'), '9000');
    await fireEvent.press(screen.getByTestId('service-fee-segment-on'));
    await fireEvent.press(screen.getByTestId('apply-pricing-button'));

    await waitFor(() =>
      expect(setPricingMock).toHaveBeenCalledWith('10', {
        surchargeCents: 500,
        discountCents: 1500,
        applyServiceFee: true,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('preview-total').props.children).toBe('R$14.30'),
    );
  });

  it('locks table lines while awaiting payment', async () => {
    await render(
      <OrderBuilder
        mode="order"
        order={makeOrder({ ...orderWithCoffee(1), status: 'AWAITING_PAYMENT' })}
        onOrderChange={jest.fn()}
        catalog={catalog}
      />,
    );

    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.queryByTestId('add-item-1')).toBeNull();
    expect(screen.queryByTestId('line-stepper-1-increase')).toBeNull();
    expect(screen.getByTestId('remove-1').props.accessibilityState.disabled).toBe(true);
  });
});
