import type { OrderResponse } from '@/types';
import { orderItemCountLabel, orderStatusLabels } from '@/utils/order-display';

describe('order display helpers', () => {
  it('uses fixed English status labels', () => {
    expect(orderStatusLabels.OPEN).toBe('Open');
    expect(orderStatusLabels.AWAITING_PAYMENT).toBe('Awaiting payment');
  });

  it('counts line quantities correctly', () => {
    const line = {
      itemId: '1',
      itemName: 'Coffee',
      quantity: 2,
      unitPriceCents: 500,
      lineTotalCents: 1000,
    };
    const order = {
      items: [line, { ...line, itemId: '2', quantity: 1 }],
    } as Pick<OrderResponse, 'items'> as OrderResponse;

    expect(orderItemCountLabel(order)).toBe('3 items');
    expect(
      orderItemCountLabel({ ...order, items: [{ ...line, quantity: 1 }] }),
    ).toBe('1 item');
  });
});
