import { render } from '@testing-library/react-native';

import { Icon, iconNames } from '@/components/icon';

describe('<Icon />', () => {
  it.each(iconNames)('renders the %s icon', async (name) => {
    const { getByTestId } = await render(<Icon name={name} size="md" color="#E85D04" />);

    expect(getByTestId('icon')).toBeTruthy();
  });

  it('uses default size, color, test ID, and semantic label', async () => {
    const { getByTestId } = await render(<Icon name="table" />);

    expect(getByTestId('icon').props.accessibilityLabel).toBe('mesa');
  });

  it('uses the requested semantic label for accessibility', async () => {
    const { getByTestId } = await render(
      <Icon name="table" size="sm" color="#241C15" testID="table-icon" accessibilityLabel="Mesas" />,
    );

    expect(getByTestId('table-icon').props.accessibilityLabel).toBe('Mesas');
  });
});
