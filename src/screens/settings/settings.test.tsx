import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Redirect, useFocusEffect } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Settings from '@/screens/settings';
import type { RoleCode, SettingsResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

function makeSettings(enabled = false, basisPoints = 1000): SettingsResponse {
  return {
    serviceFeeEnabled: enabled,
    serviceFeeBasisPoints: basisPoints,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: toRoleSet(roles),
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  } as unknown as ReturnType<typeof useSession>);
}

describe('<Settings />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      useEffect(() => {
        effect();
      }, [effect]);
    });
    mockRoles(['ADMIN']);
    jest.spyOn(api.settings, 'get').mockResolvedValue(makeSettings());
    jest
      .spyOn(api.settings, 'update')
      .mockImplementation(async (body) =>
        makeSettings(
          body.serviceFeeEnabled === true,
          body.serviceFeeBasisPoints ?? 0,
        ),
      );
  });

  it('loads and saves the service fee configuration', async () => {
    await render(<Settings />);

    expect(await screen.findByTestId('settings-form')).toBeTruthy();
    expect(screen.getByTestId('settings-basis-points').props.value).toBe('1000');

    await fireEvent(screen.getByTestId('settings-enabled'), 'valueChange', true);
    await fireEvent.changeText(screen.getByTestId('settings-basis-points'), '1250');
    await fireEvent.press(screen.getByTestId('settings-save'));

    await waitFor(() =>
      expect(api.settings.update).toHaveBeenCalledWith({
        serviceFeeEnabled: true,
        serviceFeeBasisPoints: 1250,
      }),
    );
    expect(await screen.findByTestId('settings-saved')).toBeTruthy();
    expect(screen.getByTestId('settings-basis-points').props.value).toBe('1250');
  });

  it('blocks invalid basis-point values before submit', async () => {
    await render(<Settings />);
    await screen.findByTestId('settings-form');

    await fireEvent.changeText(screen.getByTestId('settings-basis-points'), '10001');
    await fireEvent.press(screen.getByTestId('settings-save'));
    expect(screen.getByText('Informe um número inteiro de 0 a 10000.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('settings-basis-points'), '12.5');
    await fireEvent.press(screen.getByTestId('settings-save'));
    expect(screen.getByText('Informe um número inteiro de 0 a 10000.')).toBeTruthy();
    expect(api.settings.update).not.toHaveBeenCalled();
  });

  it('rejects an unsafe integer basis-point value', async () => {
    await render(<Settings />);
    await screen.findByTestId('settings-form');

    await fireEvent.changeText(screen.getByTestId('settings-basis-points'), '99999999999999999999');
    await fireEvent.press(screen.getByTestId('settings-save'));

    expect(screen.getByText('Informe um número inteiro de 0 a 10000.')).toBeTruthy();
    expect(api.settings.update).not.toHaveBeenCalled();
  });

  it('shows a fixed Portuguese error with retry support', async () => {
    jest
      .spyOn(api.settings, 'get')
      .mockRejectedValue(new ApiError({ status: 403, code: 'FORBIDDEN' }));

    await render(<Settings />);

    expect(await screen.findByText('Você não tem permissão para realizar esta ação.')).toBeTruthy();

    jest.spyOn(api.settings, 'get').mockResolvedValue(makeSettings(true, 500));
    await fireEvent.press(screen.getByTestId('settings-error-retry'));

    await waitFor(() => expect(screen.queryByTestId('settings-error')).toBeNull());
    expect(await screen.findByTestId('settings-form')).toBeTruthy();
    expect(screen.getByTestId('settings-basis-points').props.value).toBe('500');
  });

  it('redirects non-administrators before loading settings', async () => {
    mockRoles(['CASHIER']);

    await render(<Settings />);

    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href).toBe('/');
    expect(api.settings.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId('settings-form')).toBeNull();
  });
});
