import { ApiError } from '@/services/api';
import { occupiedOrderId, toErrorMessage } from '@/utils/errors';

describe('error helpers', () => {
  it('uses the fixed English message for API errors', () => {
    expect(toErrorMessage(new ApiError({ status: 403, code: 'FORBIDDEN' }))).toBe(
      'You are not allowed to perform this action.',
    );
  });

  it('falls back to a fixed English message for unexpected errors', () => {
    expect(toErrorMessage(new Error('raw backend detail'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('reads the order id from a table conflict', () => {
    const error = new ApiError({
      status: 409,
      code: 'TABLE_OCCUPIED',
      details: { orderId: '42' },
    });

    expect(occupiedOrderId(error)).toBe('42');
  });

  it('ignores errors that are not table conflicts', () => {
    expect(occupiedOrderId(new ApiError({ status: 409, code: 'CONFLICT' }))).toBeNull();
    expect(occupiedOrderId(new Error('conflict'))).toBeNull();
  });
});
