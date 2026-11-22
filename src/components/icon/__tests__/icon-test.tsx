import { render } from '@testing-library/react-native';

import { Icon, iconNames } from '@/components/icon';

describe('<Icon />', () => {
  it.each(iconNames)('renders the %s icon', async (name) => {
    const { getByTestId } = await render(<Icon name={name} size="md" color="#E85D04" />);

    expect(getByTestId('icon')).toBeTruthy();
  });

  it('uses the requested semantic label for accessibility', async () => {
    const { getByTestId } = await render(
      <Icon name="table" size="sm" color="#241C15" testID="table-icon" accessibilityLabel="Tables" />,
    );

    expect(getByTestId('table-icon').props.accessibilityLabel).toBe('Tables');
  });
});
