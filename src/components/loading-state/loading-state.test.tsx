import { render, screen } from '@testing-library/react-native';

import { LoadingState } from '@/components/loading-state';

describe('<LoadingState />', () => {
  it('renders an indicator without a message', async () => {
    await render(<LoadingState />);

    expect(screen.getByTestId('loading-state-indicator')).toBeTruthy();
  });

  it('renders a message when provided', async () => {
    await render(<LoadingState message="Loading orders..." />);

    expect(screen.getByText('Loading orders...')).toBeTruthy();
  });
});
