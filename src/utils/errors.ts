import { ApiError, getErrorMessage } from '@/services/api';

export function toErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : getErrorMessage('INTERNAL_ERROR');
}

export function occupiedOrderId(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'TABLE_OCCUPIED') {
    return null;
  }

  const details = error.details as { readonly orderId?: unknown } | null | undefined;

  return typeof details?.orderId === 'string' && details.orderId.length > 0
    ? details.orderId
    : null;
}
