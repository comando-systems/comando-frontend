import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '@/components/card';

describe('<Card />', () => {
  it('renders static content', async () => {
    await render(
      <Card>
        <Text>Card content</Text>
      </Card>,
    );

    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('handles presses when interactive', async () => {
    const onPress = jest.fn();
    await render(
      <Card onPress={onPress}>
        <Text>Open order</Text>
      </Card>,
    );

    await fireEvent.press(screen.getByTestId('card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies pressed feedback to interactive cards', async () => {
    await render(
      <Card onPress={jest.fn()}>
        <Text>Press me</Text>
      </Card>,
    );

    await fireEvent(screen.getByTestId('card'), 'pressIn');

    expect(screen.getByText('Press me')).toBeTruthy();
  });
});
