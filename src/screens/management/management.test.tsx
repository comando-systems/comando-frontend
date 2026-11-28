import { fireEvent, render, screen } from '@testing-library/react-native';
import { Redirect, useRouter } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import Management from '@/screens/management';
import type { RoleCode } from '@/types';
import { toRoleSet } from '@/utils/roles';

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
      roles: toRoleSet(roles),
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

  it('links administrators to management sections', async () => {
    await render(<Management />);

    expect(screen.getByText('Usuários')).toBeTruthy();
    expect(screen.getByText('Catálogo')).toBeTruthy();
    expect(screen.getByText('Configurações')).toBeTruthy();
    expect(screen.getByText('Relatórios')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('management-users-link'));
    await fireEvent.press(screen.getByTestId('management-catalog-link'));
    await fireEvent.press(screen.getByTestId('management-settings-link'));
    await fireEvent.press(screen.getByTestId('management-reports-link'));

    expect(push).toHaveBeenCalledWith('/management/users');
    expect(push).toHaveBeenCalledWith('/management/catalog');
    expect(push).toHaveBeenCalledWith('/management/settings');
    expect(push).toHaveBeenCalledWith('/management/reports');
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('redirects non-administrators away from management', async () => {
    mockRoles(['CASHIER']);

    await render(<Management />);

    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href).toBe('/');
    expect(screen.queryByTestId('management-users-link')).toBeNull();
    expect(screen.queryByTestId('management-catalog-link')).toBeNull();
    expect(screen.queryByTestId('management-settings-link')).toBeNull();
    expect(screen.queryByTestId('management-reports-link')).toBeNull();
  });
});
