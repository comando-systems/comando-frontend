import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Redirect, useFocusEffect } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Users from '@/screens/users';
import type {
  CreateUserRequest,
  PageResponse,
  RoleCode,
  UpdateUserRequest,
  UserResponse,
} from '@/types';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

const createdAt = '2026-01-01T00:00:00.000Z';

function makeUser(
  id: string,
  roles: readonly RoleCode[],
  isActive = true,
  name = 'Ada Lovelace',
  email = 'ada@example.com',
): UserResponse {
  return {
    id,
    name,
    email,
    roles,
    isActive,
    createdAt,
    updatedAt: createdAt,
  };
}

function makePage(
  data: readonly UserResponse[],
  page: number,
  totalPages: number,
  total = data.length,
): PageResponse<UserResponse> {
  return {
    data,
    pagination: { page, pageSize: 20, total, totalPages },
  };
}

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: makeUser('user-1', roles),
  } as unknown as ReturnType<typeof useSession>);
}

async function openCreateForm() {
  await fireEvent.press(await screen.findByTestId('add-user-button'));
  expect(await screen.findByTestId('user-form')).toBeTruthy();
}

describe('<Users />', () => {
  const admin = makeUser('user-1', ['ADMIN']);
  const cashier = makeUser(
    '2',
    ['CASHIER'],
    true,
    'Grace Hopper',
    'grace@example.com',
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      useEffect(() => {
        effect();
      }, [effect]);
    });
    mockRoles(['ADMIN']);
    jest.spyOn(api.users, 'list').mockResolvedValue(makePage([admin, cashier], 1, 1, 2));
    jest.spyOn(api.users, 'create').mockResolvedValue(cashier);
    jest.spyOn(api.users, 'update').mockResolvedValue(cashier);
    jest.spyOn(api.users, 'deactivate').mockResolvedValue({
      ...cashier,
      isActive: false,
    });
  });

  it('lists users with pagination and active status', async () => {
    jest.spyOn(api.users, 'list').mockImplementation(async (query) => {
      if (query?.page === 2) {
        return makePage([makeUser('3', ['SERVER'], true, 'Alan Turing', 'alan@example.com')], 2, 2, 3);
      }

      return makePage([admin, cashier], 1, 2, 3);
    });

    await render(<Users />);

    expect(await screen.findByTestId('user-row-user-1')).toBeTruthy();
    expect(screen.getByTestId('user-row-2')).toBeTruthy();
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByTestId('users-next').props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(screen.getByTestId('users-next'));

    await waitFor(() =>
      expect(api.users.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }),
    );
    expect(await screen.findByTestId('user-row-3')).toBeTruthy();
    expect(screen.getByTestId('users-page-label').props.children).toBe('Page 2 of 2');
  });

  it('creates a user with selected roles and trims text fields', async () => {
    await render(<Users />);
    await openCreateForm();

    await fireEvent.changeText(screen.getByTestId('user-name'), '  Linus Torvalds ');
    await fireEvent.changeText(screen.getByTestId('user-email'), ' linus@example.com ');
    await fireEvent.changeText(screen.getByTestId('user-password'), 'secret123');
    await fireEvent.press(screen.getByTestId('user-role-CASHIER'));
    await fireEvent.press(screen.getByTestId('user-submit'));

    await waitFor(() =>
      expect(api.users.create).toHaveBeenCalledWith({
        name: 'Linus Torvalds',
        email: 'linus@example.com',
        password: 'secret123',
        roles: ['CASHIER'],
      } satisfies CreateUserRequest),
    );
    await waitFor(() => expect(screen.queryByTestId('user-form')).toBeNull());
  });

  it('validates required create fields before submitting', async () => {
    await render(<Users />);
    await openCreateForm();

    await fireEvent.press(screen.getByTestId('user-submit'));
    expect(screen.getByText('Enter a name.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('user-name'), 'Linus Torvalds');
    await fireEvent.changeText(screen.getByTestId('user-email'), 'not-an-email');
    await fireEvent.press(screen.getByTestId('user-submit'));
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('user-email'), 'linus@example.com');
    await fireEvent.press(screen.getByTestId('user-submit'));
    expect(screen.getByText('Select at least one role.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('user-role-CASHIER'));
    await fireEvent.changeText(screen.getByTestId('user-password'), 'short');
    await fireEvent.press(screen.getByTestId('user-submit'));
    expect(screen.getByText('Password must be 8 to 128 characters.')).toBeTruthy();
    expect(api.users.create).not.toHaveBeenCalled();
  });

  it('edits a user without replacing an omitted password', async () => {
    await render(<Users />);

    await fireEvent.press(await screen.findByTestId('user-edit-2'));
    await fireEvent.changeText(await screen.findByTestId('user-name'), ' Grace Murray Hopper ');
    await fireEvent.press(screen.getByTestId('user-submit'));

    await waitFor(() =>
      expect(api.users.update).toHaveBeenCalledWith('2', {
        name: 'Grace Murray Hopper',
        email: 'grace@example.com',
        roles: ['CASHIER'],
      } satisfies UpdateUserRequest),
    );
  });

  it('validates edit passwords and prevents self-demotion', async () => {
    await render(<Users />);

    await fireEvent.press(await screen.findByTestId('user-edit-user-1'));
    expect(await screen.findByTestId('user-self-role-note')).toBeTruthy();
    expect(
      screen.getByTestId('user-role-ADMIN').props.accessibilityState.disabled,
    ).toBe(true);

    await fireEvent.changeText(screen.getByTestId('user-password'), 'short');
    await fireEvent.press(screen.getByTestId('user-submit'));

    expect(screen.getByText('Password must be 8 to 128 characters.')).toBeTruthy();
    expect(api.users.update).not.toHaveBeenCalled();
  });

  it('deactivates and reactivates users through the supported endpoints', async () => {
    let deactivated = false;
    jest.spyOn(api.users, 'list').mockImplementation(async () =>
      makePage(
        [admin, deactivated ? { ...cashier, isActive: false } : cashier],
        1,
        1,
        2,
      ),
    );
    jest.spyOn(api.users, 'deactivate').mockImplementation(async () => {
      deactivated = true;
      return { ...cashier, isActive: false };
    });

    await render(<Users />);

    expect(
      screen.getByTestId('user-deactivate-user-1').props.accessibilityState.disabled,
    ).toBe(true);
    expect(screen.getByTestId('user-self-note-user-1')).toBeTruthy();

    await fireEvent.press(await screen.findByTestId('user-deactivate-2'));

    await waitFor(() => expect(api.users.deactivate).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(screen.getByTestId('user-reactivate-2')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('user-reactivate-2'));

    await waitFor(() =>
      expect(api.users.update).toHaveBeenCalledWith('2', { isActive: true }),
    );
  });

  it('shows fixed English messages for admin safeguard conflicts', async () => {
    jest
      .spyOn(api.users, 'deactivate')
      .mockRejectedValue(new ApiError({ status: 409, code: 'LAST_ADMIN' }));

    await render(<Users />);
    await fireEvent.press(await screen.findByTestId('user-deactivate-2'));

    expect(await screen.findByText('The last active administrator cannot be removed.')).toBeTruthy();
    expect(screen.queryByText('LAST_ADMIN')).toBeNull();
  });

  it('redirects non-administrators before requesting users', async () => {
    mockRoles(['CASHIER']);

    await render(<Users />);

    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href).toBe('/');
    expect(api.users.list).not.toHaveBeenCalled();
  });
});
