import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import Home from '@/screens/home';
import type { RoleCode, UserResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
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

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: createUser(roles),
  } as unknown as ReturnType<typeof useSession>);
}

function redirectedHref(): unknown {
  return jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href;
}

describe('<Home />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<readonly RoleCode[]>([['CASHIER'], ['SERVER']])(
    'routes %s to tables',
    async (role) => {
      mockRoles([role]);

      await render(<Home />);

      expect(redirectedHref()).toBe('/tables');
    },
  );

  it('routes an admin without cashier access to the counter', async () => {
    mockRoles(['ADMIN']);

    await render(<Home />);

    expect(redirectedHref()).toBe('/counter');
  });

  it('routes a user without operational roles to management', async () => {
    mockRoles([]);

    await render(<Home />);

    expect(redirectedHref()).toBe('/management');
  });
});
