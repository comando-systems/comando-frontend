import { render, screen } from '@testing-library/react-native';

import Counter from '@/screens/counter';

describe('<Counter />', () => {
  it('shows the counter section placeholder', async () => {
    await render(<Counter />);

    expect(screen.getByText('Counter')).toBeTruthy();
  });
});
