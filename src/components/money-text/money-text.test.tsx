import { render, screen } from '@testing-library/react-native';

import { MoneyText } from '@/components/money-text';

describe('<MoneyText />', () => {
  it('formats integer cents for display', async () => {
    await render(<MoneyText cents={2550} />);

    expect(screen.getByTestId('money-text').props.children).toBe('R$25.50');
  });

  it('supports a custom test identifier for line totals', async () => {
    await render(<MoneyText cents={900} size="sm" testID="line-total" />);

    expect(screen.getByTestId('line-total').props.children).toBe('R$9.00');
  });
});
