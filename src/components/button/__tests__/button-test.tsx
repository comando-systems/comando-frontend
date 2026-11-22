import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/button';

describe('<Button />', () => {
  it('renders its label and icon', async () => {
    await render(<Button label="Save" onPress={jest.fn()} icon="save" />);

    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByTestId('button-icon')).toBeTruthy();
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} loading />);

    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
