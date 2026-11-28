import { fireEvent, render, screen } from '@testing-library/react-native';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppShell } from '@/components/app-shell';
import { useSession } from '@/providers/session-provider';
import type { RoleCode, UserResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
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
    mockWidth(800);
    mockInsets(0);

    jest.mocked(usePathname).mockReturnValue('/tables');
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useSession).mockReturnValue({
      user: createUser(['ADMIN']),
      signOut,
    } as unknown as ReturnType<typeof useSession>);
  });

  function mockWidth(width: number) {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width,
      height: 800,
      scale: 1,
      fontScale: 1,
    });
  }

  function mockInsets(bottom: number) {
    jest.mocked(useSafeAreaInsets).mockReturnValue({
      top: 0,
      right: 0,
      bottom,
      left: 0,
    });
  }

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

  it('renders screen content and admin navigation in the wide header', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderShell();

    expect(getByText('Screen content')).toBeTruthy();
    expect(getByTestId('app-logo')).toBeTruthy();
    expect(getByTestId('header-nav')).toBeTruthy();
    expect(queryByTestId('nav-counter')).toBeNull();
    expect(getByTestId('nav-history')).toBeTruthy();
    expect(getByTestId('nav-management')).toBeTruthy();
    expect(queryByTestId('nav-tables')).toBeNull();
    expect(queryByTestId('bottom-tab-bar')).toBeNull();
  });

  it('shows tables and hides management for a server', async () => {
    mockRoles(['SERVER']);
    const { getByTestId, queryByTestId } = await renderShell();

    expect(getByTestId('nav-tables')).toBeTruthy();
    expect(queryByTestId('nav-counter')).toBeNull();
    expect(queryByTestId('nav-history')).toBeNull();
    expect(queryByTestId('nav-management')).toBeNull();
  });

  it('shows only the counter for a cashier', async () => {
    mockRoles(['CASHIER']);
    const { getByTestId, queryByTestId } = await renderShell();

    expect(getByTestId('nav-counter')).toBeTruthy();
    expect(queryByTestId('nav-tables')).toBeNull();
    expect(queryByTestId('nav-history')).toBeNull();
    expect(queryByTestId('nav-management')).toBeNull();
  });

  it('navigates with complete hrefs', async () => {
    await renderShell();

    await fireEvent.press(screen.getByTestId('nav-history'));

    expect(push).toHaveBeenCalledWith('/history');
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
    expect(screen.queryByTestId('nav-tables')).toBeNull();
  });

  it('highlights a nested route and shows user details on wide screens', async () => {
    jest.mocked(usePathname).mockReturnValue('/management/users');

    const { getByTestId, getByText } = await renderShell();

    expect(getByTestId('nav-management').props.accessibilityState.selected).toBe(true);
    expect(getByText('Ada Lovelace')).toBeTruthy();
    expect(getByText('Administrador')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('app-shell-content').props.style).paddingBottom,
    ).toBeUndefined();
  });

  it('shows an icon-only bottom bar and a logo-only header on narrow screens', async () => {
    mockWidth(375);

    const { getByTestId, queryByTestId, queryByText } = await renderShell();

    expect(getByTestId('app-logo')).toBeTruthy();
    expect(getByTestId('bottom-tab-bar')).toBeTruthy();
    expect(queryByTestId('nav-counter')).toBeNull();
    expect(getByTestId('nav-history')).toBeTruthy();
    expect(getByTestId('nav-management')).toBeTruthy();
    expect(queryByTestId('header-nav')).toBeNull();
    expect(queryByText('Ada Lovelace')).toBeNull();
    expect(queryByText('Administrador')).toBeNull();
    expect(queryByText('ME')).toBeNull();
    expect(queryByText('Balcão')).toBeNull();
    expect(queryByText('Mesas')).toBeNull();
    expect(queryByText('Gerenciamento')).toBeNull();
    expect(getByTestId('sign-out-button')).toBeTruthy();
  });

  it('navigates and highlights the active tab in the narrow bottom bar', async () => {
    mockWidth(375);
    jest.mocked(usePathname).mockReturnValue('/management');
    mockRoles(['ADMIN']);

    await renderShell();

    expect(screen.getByTestId('nav-management').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('nav-history').props.accessibilityState.selected).toBe(false);

    await fireEvent.press(screen.getByTestId('nav-history'));

    expect(push).toHaveBeenCalledWith('/history');
  });

  it('hides unauthorized tabs on narrow screens', async () => {
    mockWidth(375);
    mockRoles(['SERVER']);

    const { getByTestId, queryByTestId } = await renderShell();

    expect(getByTestId('nav-tables')).toBeTruthy();
    expect(queryByTestId('nav-counter')).toBeNull();
    expect(queryByTestId('nav-history')).toBeNull();
    expect(queryByTestId('nav-management')).toBeNull();
  });

  it('keeps content above the bottom bar and respects the safe-area inset', async () => {
    mockWidth(375);
    mockInsets(24);

    await renderShell();

    expect(StyleSheet.flatten(screen.getByTestId('bottom-tab-bar').props.style)).toEqual(
      expect.objectContaining({ paddingBottom: 24 }),
    );
    expect(StyleSheet.flatten(screen.getByTestId('app-shell-content').props.style)).toEqual(
      expect.objectContaining({ paddingBottom: 80 }),
    );
  });

  it('signs out from the narrow header', async () => {
    mockWidth(375);

    await renderShell();

    await fireEvent.press(screen.getByTestId('sign-out-button'));

    expect(signOut).toHaveBeenCalled();
  });

  it('shows fallback identity on wide screens when no user is available', async () => {
    jest.mocked(useSession).mockReturnValue({
      user: null,
      signOut,
    } as unknown as ReturnType<typeof useSession>);

    const { getByText, getAllByText } = await renderShell();

    expect(getByText('ME')).toBeTruthy();
    expect(getAllByText('Membro da equipe')).toHaveLength(2);
  });
});
