import { render, screen } from '@testing-library/react-native';

import Tables from '@/screens/tables';

describe('<Tables />', () => {
  it('shows the tables section placeholder', async () => {
    await render(<Tables />);

    expect(screen.getByText('Tables')).toBeTruthy();
  });
});
