import { render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { Screen } from '@/components/screen';

describe('<Screen />', () => {
  it('renders the heading, action, and content', async () => {
    await render(
      <Screen
        title="Mesas"
        subtitle="Pedidos de mesas ativos"
        action={<Pressable testID="screen-action" />}
      >
        <Text>Conteúdo da tela</Text>
      </Screen>,
    );

    expect(screen.getByText('Mesas')).toBeTruthy();
    expect(screen.getByText('Pedidos de mesas ativos')).toBeTruthy();
    expect(screen.getByTestId('screen-action')).toBeTruthy();
    expect(screen.getByText('Conteúdo da tela')).toBeTruthy();
  });

  it('renders content without a heading', async () => {
    await render(
      <Screen>
        <Text>Apenas conteúdo</Text>
      </Screen>,
    );

    expect(screen.getByText('Apenas conteúdo')).toBeTruthy();
    expect(screen.queryByText('Mesas')).toBeNull();
  });
});
