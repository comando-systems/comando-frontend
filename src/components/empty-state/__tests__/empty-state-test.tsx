import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/empty-state';

describe('<EmptyState />', () => {
  it('renders a title and description', async () => {
    await render(
      <EmptyState title="No tables open" description="Open a table to start an order." />,
    );

    expect(screen.getByText('No tables open')).toBeTruthy();
    expect(screen.getByText('Open a table to start an order.')).toBeTruthy();
  });

  it('offers an action when configured', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="No items" actionLabel="Refresh" onAction={onAction} />);

    await fireEvent.press(screen.getByTestId('empty-state-action'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
