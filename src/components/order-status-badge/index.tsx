import { Badge, type BadgeTone } from '@/components/badge';
import type { OrderStatus } from '@/types';
import { orderStatusLabels } from '@/utils/order-display';

export interface OrderStatusBadgeProps {
  readonly status: OrderStatus;
  readonly testID?: string;
}

const tones: Record<OrderStatus, BadgeTone> = {
  OPEN: 'success',
  AWAITING_PAYMENT: 'warning',
  CLOSED: 'info',
  CANCELED: 'danger',
};

export function OrderStatusBadge({ status, testID = 'order-status-badge' }: OrderStatusBadgeProps) {
  return <Badge label={orderStatusLabels[status]} tone={tones[status]} testID={testID} />;
}
