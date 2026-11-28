import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '@/components/card';

describe('<Card />', () => {
  it('renders static content', async () => {
    await render(
      <Card>
        <Text>Conteúdo do cartão</Text>
      </Card>,
    );

    expect(screen.getByText('Conteúdo do cartão')).toBeTruthy();
  });

  it('handles presses when interactive', async () => {
    const onPress = jest.fn();
    await render(
      <Card onPress={onPress}>
        <Text>Abrir pedido</Text>
      </Card>,
    );

    await fireEvent.press(screen.getByTestId('card'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies pressed feedback to interactive cards', async () => {
    await render(
      <Card onPress={jest.fn()}>
        <Text>Pressione aqui</Text>
      </Card>,
    );

    await fireEvent(screen.getByTestId('card'), 'pressIn');

    expect(screen.getByText('Pressione aqui')).toBeTruthy();
  });
});
