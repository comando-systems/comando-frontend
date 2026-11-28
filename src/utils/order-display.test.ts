import type { OrderResponse } from '@/types';
import { orderItemCountLabel, orderStatusLabels, orderTableLabel } from '@/utils/order-display';

describe('order display helpers', () => {
  it('uses fixed Portuguese status labels', () => {
    expect(orderStatusLabels.OPEN).toBe('Aberto');
    expect(orderStatusLabels.AWAITING_PAYMENT).toBe('Aguardando pagamento');
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

    expect(orderItemCountLabel(order)).toBe('3 itens');
    expect(
      orderItemCountLabel({ ...order, items: [{ ...line, quantity: 1 }] }),
    ).toBe('1 item');
  });

  it('falls back to the original table name once the order is finalized', () => {
    expect(orderTableLabel({ tableCode: 'Mesa 1', originalTableCode: 'Mesa 1' } as OrderResponse)).toBe(
      'Mesa 1',
    );
    expect(orderTableLabel({ tableCode: null, originalTableCode: 'Mesa 2' } as OrderResponse)).toBe(
      'Mesa 2',
    );
    expect(orderTableLabel({ tableCode: null, originalTableCode: null } as OrderResponse)).toBeNull();
  });
});
