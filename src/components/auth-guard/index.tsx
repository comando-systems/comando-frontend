import { Redirect, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/providers/session-provider';
import { colors } from '@/theme';

interface AuthGuardProps {
  readonly children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { session, isLoading } = useSession();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View
        testID="auth-loading"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isLoginRoute = pathname === '/login';

  if (session === null && !isLoginRoute) {
    return <Redirect href="/login" />;
  }

  if (session !== null && isLoginRoute) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
