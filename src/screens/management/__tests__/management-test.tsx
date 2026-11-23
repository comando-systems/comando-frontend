import { fireEvent, render, screen } from '@testing-library/react-native';
import { Redirect, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import Management from '@/screens/management';
import type { RoleCode } from '@/types';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useRouter: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

const createdAt = '2026-01-01T00:00:00.000Z';
const push = jest.fn();

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
  } as unknown as ReturnType<typeof useSession>);
}

describe('<Management />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockRoles(['ADMIN']);
  });

  it('links administrators to user management', async () => {
    await render(<Management />);

    expect(screen.getByText('Users')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('management-users-link'));

    expect(push).toHaveBeenCalledWith('/management/users');
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('redirects non-administrators away from management', async () => {
    mockRoles(['CASHIER']);

    await render(<Management />);

    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href).toBe('/');
    expect(screen.queryByTestId('management-users-link')).toBeNull();
  });
});
