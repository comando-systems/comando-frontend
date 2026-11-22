import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useSession } from '@/providers/session-provider';
import { colors, radii, spacing, typography } from '@/theme';
import type { RoleCode } from '@/types';
import { permissions } from '@/utils/permissions';

type NavHref = '/tables' | '/counter' | '/history' | '/management';

interface NavItem {
  readonly href: NavHref;
  readonly label: string;
  readonly icon: IconName;
  readonly enabled: boolean;
}

const roleLabels: Record<RoleCode, string> = {
  ADMIN: 'Administrator',
  CASHIER: 'Cashier',
  SERVER: 'Server',
};

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items: readonly NavItem[] = [
    {
      href: '/tables',
      label: 'Tables',
      icon: 'table',
      enabled: permissions.canUseTables(user),
    },
    {
      href: '/counter',
      label: 'Counter',
      icon: 'counter',
      enabled: permissions.canUseCounter(user),
    },
    {
      href: '/history',
      label: 'History',
      icon: 'history',
      enabled: permissions.canViewHistory(user),
    },
    {
      href: '/management',
      label: 'Management',
      icon: 'settings',
      enabled: permissions.canManage(user),
    },
  ];

  const navigate = useCallback(
    (href: NavHref) => {
      router.push(href);
    },
    [router],
  );

  const roleText =
    user?.roles.map((role) => roleLabels[role]).join(' · ') ?? 'Team member';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text style={{ ...typography.title, color: colors.white }}>Comando</Text>
          <Text style={{ ...typography.caption, color: colors.white, marginTop: spacing.xs }}>
            {user?.name ?? 'Team member'} · {roleText}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          testID="sign-out-button"
          onPress={() => {
            void signOut();
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryDark,
          }}
        >
          <Icon name="logout" size="md" color={colors.white} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>{children}</View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + spacing.sm,
          paddingTop: spacing.sm,
        }}
      >
        {items
          .filter((item) => item.enabled)
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                testID={`nav-${item.label.toLowerCase()}`}
                onPress={() => navigate(item.href)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.sm,
                  borderRadius: radii.md,
                  backgroundColor: isActive ? colors.primarySoft : colors.surface,
                }}
              >
                <Icon
                  name={item.icon}
                  size="sm"
                  color={isActive ? colors.primaryDark : colors.textMuted}
                />
                <Text
                  style={{
                    ...typography.caption,
                    color: isActive ? colors.primaryDark : colors.textMuted,
                    marginTop: spacing.xs,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
      </View>
    </View>
  );
}
