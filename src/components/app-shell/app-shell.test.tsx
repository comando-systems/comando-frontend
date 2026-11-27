import { fireEvent, render, screen } from '@testing-library/react-native';
import { usePathname, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppShell } from '@/components/app-shell';
import { useSession } from '@/providers/session-provider';
import type { RoleCode, UserResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
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

describe('<AppShell />', () => {
  let push: jest.Mock;
  let signOut: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    push = jest.fn();
    signOut = jest.fn().mockResolvedValue(undefined);

    jest.mocked(usePathname).mockReturnValue('/tables');
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useSafeAreaInsets).mockReturnValue({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    jest.mocked(useSession).mockReturnValue({
      user: createUser(['ADMIN']),
      signOut,
    } as unknown as ReturnType<typeof useSession>);
  });

  function mockRoles(roles: readonly RoleCode[]) {
    jest.mocked(useSession).mockReturnValue({
      user: createUser(roles),
      signOut,
    } as unknown as ReturnType<typeof useSession>);
  }

  async function renderShell() {
    return render(
      <AppShell>
        <Text>Screen content</Text>
      </AppShell>,
    );
  }

  it('renders screen content and admin navigation', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderShell();

    expect(getByText('Screen content')).toBeTruthy();
    expect(getByTestId('app-logo')).toBeTruthy();
    expect(getByTestId('nav-counter')).toBeTruthy();
    expect(getByTestId('nav-history')).toBeTruthy();
    expect(getByTestId('nav-management')).toBeTruthy();
    expect(queryByTestId('nav-tables')).toBeNull();
  });

  it('shows tables and hides management for a server', async () => {
    mockRoles(['SERVER']);
    const { getByTestId, queryByTestId } = await renderShell();

    expect(getByTestId('nav-tables')).toBeTruthy();
    expect(queryByTestId('nav-counter')).toBeNull();
    expect(queryByTestId('nav-history')).toBeNull();
    expect(queryByTestId('nav-management')).toBeNull();
  });

  it('shows counter and history but not management for a cashier', async () => {
    mockRoles(['CASHIER']);
    const { getByTestId, queryByTestId } = await renderShell();

    expect(getByTestId('nav-tables')).toBeTruthy();
    expect(getByTestId('nav-counter')).toBeTruthy();
    expect(getByTestId('nav-history')).toBeTruthy();
    expect(queryByTestId('nav-management')).toBeNull();
  });

  it('navigates with complete hrefs', async () => {
    await renderShell();

    await fireEvent.press(screen.getByTestId('nav-counter'));

    expect(push).toHaveBeenCalledWith('/counter');
  });

  it('signs out from the header', async () => {
    await renderShell();

    await fireEvent.press(screen.getByTestId('sign-out-button'));

    expect(signOut).toHaveBeenCalled();
  });

  it('highlights the active navigation item', async () => {
    jest.mocked(usePathname).mockReturnValue('/counter');
    mockRoles(['CASHIER']);

    await renderShell();

    expect(screen.getByTestId('nav-counter').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('nav-tables').props.accessibilityState.selected).toBe(false);
  });
});
