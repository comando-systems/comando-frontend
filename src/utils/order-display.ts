import type { OrderResponse, OrderStatus } from '@/types';

export const orderStatusLabels: Record<OrderStatus, string> = {
  OPEN: 'Open',
  AWAITING_PAYMENT: 'Awaiting payment',
  CLOSED: 'Closed',
  CANCELED: 'Canceled',
};

export function orderItemCountLabel(order: OrderResponse): string {
  const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}
