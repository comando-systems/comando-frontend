import { render, screen } from '@testing-library/react-native';

import Management from '@/screens/management';

describe('<Management />', () => {
  it('shows the management section placeholder', async () => {
    await render(<Management />);

    expect(screen.getByText('Management')).toBeTruthy();
  });
});
