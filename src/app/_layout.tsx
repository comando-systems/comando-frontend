import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGuard } from '@/components/auth-guard';
import { SessionProvider } from '@/providers/session-provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AuthGuard>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
