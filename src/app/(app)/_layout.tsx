import { Slot } from 'expo-router';

import { AppShell } from '@/components/app-shell';
import { RoleGuard } from '@/components/role-guard';

export default function AppLayout() {
  return (
    <RoleGuard>
      <AppShell>
        <Slot />
      </AppShell>
    </RoleGuard>
  );
}
