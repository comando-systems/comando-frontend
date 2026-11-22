import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { SessionResponse, UserResponse } from '@/types';

const SESSION_KEY = 'comando.session';

export type SessionChangeReason = 'save' | 'clear';
type SessionListener = (session: SessionResponse | null, reason: SessionChangeReason) => void;

const listeners = new Set<SessionListener>();

export function subscribeToSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitSessionChange(session: SessionResponse | null, reason: SessionChangeReason): void {
  listeners.forEach((listener) => listener(session, reason));
}

function isUserResponse(value: unknown): value is UserResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.isActive === 'boolean' &&
    Array.isArray(user.roles)
  );
}

function isSessionResponse(value: unknown): value is SessionResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.accessToken === 'string' &&
    typeof session.expiresAt === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.refreshExpiresAt === 'string' &&
    isUserResponse(session.user)
  );
}

interface StorageBackend {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

const memoryValues = new Map<string, string>();

function getWebBackend(): StorageBackend {
  const storage =
    typeof localStorage !== 'undefined'
      ? localStorage
      : typeof window !== 'undefined'
        ? window.localStorage
        : undefined;

  if (storage) {
    return {
      async read() {
        return storage.getItem(SESSION_KEY);
      },
      async write(value) {
        storage.setItem(SESSION_KEY, value);
      },
      async remove() {
        storage.removeItem(SESSION_KEY);
      },
    };
  }

  return {
    async read() {
      return memoryValues.get(SESSION_KEY) ?? null;
    },
    async write(value) {
      memoryValues.set(SESSION_KEY, value);
    },
    async remove() {
      memoryValues.delete(SESSION_KEY);
    },
  };
}

function getNativeBackend(): StorageBackend {
  return {
    async read() {
      try {
        return await SecureStore.getItemAsync(SESSION_KEY);
      } catch {
        return null;
      }
    },
    async write(value) {
      await SecureStore.setItemAsync(SESSION_KEY, value);
    },
    async remove() {
      try {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } catch {
        // A missing value is already the desired state.
      }
    },
  };
}

export interface SessionStorage {
  read(): Promise<SessionResponse | null>;
  save(session: SessionResponse): Promise<void>;
  clear(): Promise<void>;
}

export function createSessionStorage(platform: 'web' | 'native'): SessionStorage {
  const backend = platform === 'web' ? getWebBackend() : getNativeBackend();

  return {
    async read() {
      const raw = await backend.read();

      if (raw === null) {
        return null;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        if (isSessionResponse(parsed)) {
          return parsed;
        }
      } catch {
        // Invalid persisted data is treated as no session.
      }

      await backend.remove();
      return null;
    },
    async save(session) {
      await backend.write(JSON.stringify(session));
      emitSessionChange(session, 'save');
    },
    async clear() {
      await backend.remove();
      emitSessionChange(null, 'clear');
    },
  };
}

export const sessionStorage = createSessionStorage(Platform.OS === 'web' ? 'web' : 'native');
