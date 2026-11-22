import { act, renderHook, waitFor } from '@testing-library/react-native';

import { SessionProvider, useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { sessionStorage, subscribeToSession } from '@/services/storage';
import type { SessionResponse } from '@/types';

jest.mock('@/services/api', () => ({
  api: {
    auth: {
      login: jest.fn(),
      logout: jest.fn(),
    },
  },
}));

jest.mock('@/services/storage', () => ({
  sessionStorage: {
    read: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
  },
  subscribeToSession: jest.fn(),
}));

type SessionListener = (session: SessionResponse | null, reason: 'save' | 'clear') => void;

function createSession(overrides: Partial<SessionResponse> = {}): SessionResponse {
  return {
    accessToken: 'access-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    refreshToken: 'refresh-1',
    refreshExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: {
      id: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: ['ADMIN'],
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('SessionProvider', () => {
  let listener: SessionListener | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = undefined;

    jest.mocked(subscribeToSession).mockImplementation((callback) => {
      listener = callback;
      return jest.fn();
    });
    jest.mocked(sessionStorage.read).mockResolvedValue(null);
    jest.mocked(sessionStorage.save).mockResolvedValue(undefined);
    jest.mocked(sessionStorage.clear).mockResolvedValue(undefined);
    jest.mocked(api.auth.logout).mockResolvedValue(undefined);
  });

  it('loads the persisted session and exposes role helpers', async () => {
    const session = createSession({
      user: {
        id: '2',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        roles: ['CASHIER', 'SERVER'],
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    jest.mocked(sessionStorage.read).mockResolvedValue(session);

    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.session).toEqual(session);
    expect(result.current.user).toEqual(session.user);
    expect(result.current.hasRole('SERVER')).toBe(true);
    expect(result.current.hasAnyRole(['ADMIN', 'CASHIER'])).toBe(true);
  });

  it('stores the session on sign-in', async () => {
    const session = createSession();
    const credentials = { email: 'ada@example.com', password: 'secret123' };
    jest.mocked(api.auth.login).mockResolvedValue(session);

    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn(credentials);
    });

    expect(api.auth.login).toHaveBeenCalledWith(credentials);
    expect(sessionStorage.save).toHaveBeenCalledWith(session);
    expect(result.current.session).toEqual(session);
  });

  it('clears the local session when sign-out fails remotely', async () => {
    jest.mocked(api.auth.logout).mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });

  it('reacts when the stored session is cleared by an expired request', async () => {
    const session = createSession();
    jest.mocked(sessionStorage.read).mockResolvedValue(session);

    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(result.current.user).toEqual(session.user));

    await act(async () => {
      listener?.(session, 'save');
      listener?.(null, 'clear');
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('discards a session whose refresh token has expired', async () => {
    const session = createSession({
      refreshExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    jest.mocked(sessionStorage.read).mockResolvedValue(session);

    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => {
      expect(sessionStorage.clear).toHaveBeenCalled();
      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
