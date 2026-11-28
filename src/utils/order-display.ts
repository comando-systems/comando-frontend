import type { OrderResponse, OrderStatus } from '@/types';

export const orderStatusLabels: Record<OrderStatus, string> = {
  OPEN: 'Aberto',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  CLOSED: 'Fechado',
  CANCELED: 'Cancelado',
};

export function orderItemCountLabel(order: OrderResponse): string {
  const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} ${count === 1 ? 'item' : 'itens'}`;
}
