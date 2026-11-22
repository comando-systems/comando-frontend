import { render, screen } from '@testing-library/react-native';

import { OrderStatusBadge } from '@/components/order-status-badge';

describe('<OrderStatusBadge />', () => {
  it('renders the English status label', async () => {
    await render(<OrderStatusBadge status="AWAITING_PAYMENT" />);

    expect(screen.getByText('Awaiting payment')).toBeTruthy();
  });

  it('supports a custom test identifier', async () => {
    await render(<OrderStatusBadge status="CANCELED" testID="canceled-status" />);

    expect(screen.getByTestId('canceled-status')).toBeTruthy();
  });
});
