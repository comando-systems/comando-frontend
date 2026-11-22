import { render, screen } from '@testing-library/react-native';

import Login from '@/screens/login';

describe('<Login />', () => {
  it('shows the product name and sign-in prompt', async () => {
    await render(<Login />);

    expect(screen.getByText('Comando')).toBeTruthy();
    expect(screen.getByText('Sign in to manage orders.')).toBeTruthy();
  });
});
