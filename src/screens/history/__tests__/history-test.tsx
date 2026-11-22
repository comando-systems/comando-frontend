import { render, screen } from '@testing-library/react-native';

import History from '@/screens/history';

describe('<History />', () => {
  it('shows the history section placeholder', async () => {
    await render(<History />);

    expect(screen.getByText('History')).toBeTruthy();
  });
});
