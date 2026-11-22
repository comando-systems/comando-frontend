import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorBanner } from '@/components/error-banner';

describe('<ErrorBanner />', () => {
  it('renders the error message', async () => {
    await render(<ErrorBanner message="The order could not be loaded." />);

    expect(screen.getByText('The order could not be loaded.')).toBeTruthy();
    expect(screen.queryByTestId('error-banner-retry')).toBeNull();
  });

  it('offers a retry action when requested', async () => {
    const onRetry = jest.fn();
    await render(<ErrorBanner message="The order could not be loaded." onRetry={onRetry} />);

    await fireEvent.press(screen.getByTestId('error-banner-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
