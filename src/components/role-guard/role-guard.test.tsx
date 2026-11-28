import { render } from '@testing-library/react-native';
import { Redirect, usePathname } from 'expo-router';
import { Text } from 'react-native';

import { RoleGuard } from '@/components/role-guard';
import { useSession } from '@/providers/session-provider';
import type { RoleCode, UserResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  usePathname: jest.fn(),
  Redirect: jest.fn(() => null),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

function createUser(roles: readonly RoleCode[]): UserResponse {
  return {
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    roles: toRoleSet(roles),
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function mockUser(roles: readonly RoleCode[] | null) {
  const user = roles === null ? null : createUser(roles);

  jest.mocked(useSession).mockReturnValue({
    user,
  } as unknown as ReturnType<typeof useSession>);
}

function redirectedHref(): unknown {
  return jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href;
}

async function renderGuard() {
  return render(
    <RoleGuard>
      <Text>Conteúdo permitido</Text>
    </RoleGuard>,
  );
}

describe('<RoleGuard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePathname).mockReturnValue('/tables');
    mockUser(['ADMIN']);
  });

  it('allows admins to open management', async () => {
    jest.mocked(usePathname).mockReturnValue('/management');
    mockUser(['ADMIN']);

    const { getByText } = await renderGuard();

    expect(getByText('Conteúdo permitido')).toBeTruthy();
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('redirects non-admins away from management', async () => {
    jest.mocked(usePathname).mockReturnValue('/management');
    mockUser(['SERVER']);

    await renderGuard();

    expect(redirectedHref()).toBe('/');
  });

  it('redirects non-admins away from management subroutes', async () => {
    jest.mocked(usePathname).mockReturnValue('/management/users');
    mockUser(['SERVER']);

    await renderGuard();

    expect(redirectedHref()).toBe('/');
  });

  it('redirects servers away from counter sales', async () => {
    jest.mocked(usePathname).mockReturnValue('/counter');
    mockUser(['SERVER']);

    await renderGuard();

    expect(redirectedHref()).toBe('/');
  });

  it('allows cashiers to open counter sales', async () => {
    jest.mocked(usePathname).mockReturnValue('/counter');
    mockUser(['CASHIER']);

    const { getByText } = await renderGuard();

    expect(getByText('Conteúdo permitido')).toBeTruthy();
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('redirects signed-out users to login', async () => {
    mockUser(null);

    await renderGuard();

    expect(redirectedHref()).toBe('/login');
  });

  it('allows admins to view tables without granting table actions', async () => {
    jest.mocked(usePathname).mockReturnValue('/tables');
    mockUser(['ADMIN']);

    const { getByText } = await renderGuard();

    expect(getByText('Conteúdo permitido')).toBeTruthy();
    expect(Redirect).not.toHaveBeenCalled();
  });
});
