import { render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { Screen } from '@/components/screen';

describe('<Screen />', () => {
  it('renders the heading, action, and content', async () => {
    await render(
      <Screen
        title="Tables"
        subtitle="Live table orders"
        action={<Pressable testID="screen-action" />}
      >
        <Text>Screen body</Text>
      </Screen>,
    );

    expect(screen.getByText('Tables')).toBeTruthy();
    expect(screen.getByText('Live table orders')).toBeTruthy();
    expect(screen.getByTestId('screen-action')).toBeTruthy();
    expect(screen.getByText('Screen body')).toBeTruthy();
  });

  it('renders content without a heading', async () => {
    await render(
      <Screen>
        <Text>Only content</Text>
      </Screen>,
    );

    expect(screen.getByText('Only content')).toBeTruthy();
    expect(screen.queryByText('Tables')).toBeNull();
  });
});
