import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { api } from '@/services/api';
import { sessionStorage, subscribeToSession } from '@/services/storage';
import type { LoginRequest, RoleCode, SessionResponse, UserResponse } from '@/types';

interface SessionContextValue {
  readonly session: SessionResponse | null;
  readonly user: UserResponse | null;
  readonly isLoading: boolean;
  readonly signIn: (credentials: LoginRequest) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly hasRole: (role: RoleCode) => boolean;
  readonly hasAnyRole: (roles: readonly RoleCode[]) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function isExpired(timestamp: string): boolean {
  const value = Date.parse(timestamp);
  return Number.isFinite(value) && value <= Date.now();
}

interface SessionProviderProps {
  readonly children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToSession((nextSession) => {
      if (active) {
        setSession(nextSession);
        setIsLoading(false);
      }
    });

    sessionStorage
      .read()
      .then(async (storedSession) => {
        if (storedSession !== null && isExpired(storedSession.refreshExpiresAt)) {
          await sessionStorage.clear();

          if (active) {
            setSession(null);
            setIsLoading(false);
          }
          return;
        }

        if (active) {
          setSession(storedSession);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credentials: LoginRequest) => {
    const nextSession = await api.auth.login(credentials);
    await sessionStorage.save(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Local sign-out must still happen when the backend cannot be reached.
    }

    await sessionStorage.clear();
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (role: RoleCode) => session?.user.roles.includes(role) ?? false,
    [session],
  );

  const hasAnyRole = useCallback(
    (roles: readonly RoleCode[]) => roles.some((role) => hasRole(role)),
    [hasRole],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signIn,
      signOut,
      hasRole,
      hasAnyRole,
    }),
    [session, isLoading, signIn, signOut, hasRole, hasAnyRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);

  if (value === null) {
    throw new Error('useSession must be used inside SessionProvider.');
  }

  return value;
}
