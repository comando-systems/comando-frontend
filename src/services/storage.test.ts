import * as SecureStore from 'expo-secure-store';

import { createSessionStorage, subscribeToSession } from '@/services/storage';
import type { SessionResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const session: SessionResponse = {
  accessToken: 'access-1',
  expiresAt: '2026-11-22T20:00:00.000Z',
  refreshToken: 'refresh-1',
  refreshExpiresAt: '2026-12-22T20:00:00.000Z',
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

describe('session storage', () => {
  const secureStore = jest.mocked(SecureStore);
  let webValues: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    webValues = new Map();

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: jest.fn((key: string) => webValues.get(key) ?? null),
        setItem: jest.fn((key: string, value: string) => {
          webValues.set(key, value);
        }),
        removeItem: jest.fn((key: string) => {
          webValues.delete(key);
        }),
      },
    });
  });

  it('reads a valid native session', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify(session));

    await expect(createSessionStorage('native').read()).resolves.toEqual(session);
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('comando.session');
  });

  it('removes malformed persisted data', async () => {
    secureStore.getItemAsync.mockResolvedValue('{not json');

    await expect(createSessionStorage('native').read()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('comando.session');
  });

  it('saves, reads, and clears a web session', async () => {
    const storage = createSessionStorage('web');

    await storage.save(session);
    await expect(storage.read()).resolves.toEqual(session);
    await storage.clear();

    await expect(storage.read()).resolves.toBeNull();
  });

  it('treats secure-store read failures as no session', async () => {
    secureStore.getItemAsync.mockRejectedValue(new Error('locked'));

    await expect(createSessionStorage('native').read()).resolves.toBeNull();
  });

  it('saves and clears a native session and ignores delete failures', async () => {
    const storage = createSessionStorage('native');

    await storage.save(session);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'comando.session',
      JSON.stringify(session),
    );

    await storage.clear();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('comando.session');

    secureStore.deleteItemAsync.mockRejectedValueOnce(new Error('locked'));
    await expect(storage.clear()).resolves.toBeUndefined();
  });

  it('removes persisted data with an invalid session shape', async () => {
    const storage = createSessionStorage('web');
    localStorage.setItem('comando.session', JSON.stringify({ ...session, user: { id: '1' } }));

    await expect(storage.read()).resolves.toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('comando.session');
  });

  it('falls back to memory when localStorage is unavailable', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const storage = createSessionStorage('web');

    await storage.save(session);
    await expect(storage.read()).resolves.toEqual(session);
    await storage.clear();
    await expect(storage.read()).resolves.toBeNull();
  });

  it('notifies subscribers when the session changes', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToSession(listener);
    const storage = createSessionStorage('web');

    await storage.save(session);
    await storage.clear();

    expect(listener).toHaveBeenNthCalledWith(1, session, 'save');
    expect(listener).toHaveBeenNthCalledWith(2, null, 'clear');

    unsubscribe();
  });
});
