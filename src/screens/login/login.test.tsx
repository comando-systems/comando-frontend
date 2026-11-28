import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useSession } from '@/providers/session-provider';
import { ApiError } from '@/services/api';
import Login from '@/screens/login';

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

function mockSession(signIn: jest.Mock) {
  jest.mocked(useSession).mockReturnValue({
    signIn,
  } as unknown as ReturnType<typeof useSession>);
}

async function fillForm(email: string, password: string) {
  await fireEvent.changeText(screen.getByTestId('email-input'), email);
  await fireEvent.changeText(screen.getByTestId('password-input'), password);
}

describe('<Login />', () => {
  let signIn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    signIn = jest.fn().mockResolvedValue(undefined);
    mockSession(signIn);
  });

  it('shows the product name and sign-in fields', async () => {
    await render(<Login />);

    expect(screen.getByText('Comando')).toBeTruthy();
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.queryByText(/sign up/i)).toBeNull();
  });

  it('rejects an invalid email without signing in', async () => {
    await render(<Login />);
    await fillForm('not-an-email', 'secret123');

    await fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeTruthy();
      expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('requires a password', async () => {
    await render(<Login />);
    await fillForm('ada@example.com', '');

    await fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeTruthy();
      expect(screen.getByText('Enter your password.')).toBeTruthy();
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with trimmed credentials', async () => {
    await render(<Login />);
    await fillForm('  ada@example.com  ', 'secret123');

    await fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret123' });
    });
  });

  it('shows a stable English message for invalid credentials', async () => {
    signIn.mockRejectedValue(new ApiError({ status: 401, code: 'UNAUTHORIZED' }));
    await render(<Login />);
    await fillForm('ada@example.com', 'wrong-password');

    await fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeTruthy();
      expect(screen.getByText('Authentication is required.')).toBeTruthy();
    });
  });

  it('falls back to a fixed English message for unexpected sign-in errors', async () => {
    signIn.mockRejectedValue(new Error('raw backend detail'));
    await render(<Login />);
    await fillForm('ada@example.com', 'secret123');

    await fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    });
  });
});
