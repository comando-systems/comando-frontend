import { render } from '@testing-library/react-native';
import { Redirect, usePathname } from 'expo-router';
import { Text } from 'react-native';

import { AuthGuard } from '@/components/auth-guard';
import { useSession } from '@/providers/session-provider';
import type { SessionResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  usePathname: jest.fn(),
  Redirect: jest.fn(() => null),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

function createSession(): SessionResponse {
  return {
    accessToken: 'access-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    refreshToken: 'refresh-1',
    refreshExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: {
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: toRoleSet(['ADMIN']),
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

function mockSession(session: SessionResponse | null, isLoading = false) {
  jest.mocked(useSession).mockReturnValue({
    session,
    isLoading,
  } as unknown as ReturnType<typeof useSession>);
}

function redirectedHref(): unknown {
  return jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href;
}

function renderGuard() {
  return render(
    <AuthGuard>
      <Text>Conteúdo protegido</Text>
    </AuthGuard>,
  );
}

describe('<AuthGuard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePathname).mockReturnValue('/tables');
    mockSession(createSession());
  });

  it('shows a loading state while the session is restored', async () => {
    mockSession(null, true);

    const { getByTestId, queryByText } = await renderGuard();

    expect(getByTestId('auth-loading')).toBeTruthy();
    expect(queryByText('Conteúdo protegido')).toBeNull();
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('redirects signed-out visitors to login', async () => {
    mockSession(null);

    await renderGuard();

    expect(redirectedHref()).toBe('/login');
  });

  it('redirects signed-in visitors away from login', async () => {
    jest.mocked(usePathname).mockReturnValue('/login');
    mockSession(createSession());

    await renderGuard();

    expect(redirectedHref()).toBe('/');
  });

  it('renders protected content for a signed-in user', async () => {
    const { getByText } = await renderGuard();

    expect(getByText('Conteúdo protegido')).toBeTruthy();
    expect(Redirect).not.toHaveBeenCalled();
  });
});
