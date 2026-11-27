import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useSession } from '@/providers/session-provider';
import { colors, radii, spacing, typography } from '@/theme';
import { ROLE_CODES, type RoleCode } from '@/types';
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  brand: {
    flexShrink: 0,
  },
  logo: {
    height: 40,
    width: 158,
  },
  logoCompact: {
    height: 30,
    width: 120,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navItemActive: {
    backgroundColor: colors.primarySoft,
  },
  navLabel: {
    color: colors.textMuted,
    ...typography.label,
  },
  navLabelActive: {
    color: colors.primaryDark,
  },
  user: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  userName: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '700',
  },
  userRole: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  signOut: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 700;

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
    user === null
      ? 'Team member'
      : ROLE_CODES.filter((role) => user.roles[role] === role)
          .map((role) => roleLabels[role])
          .join(' · ');
  const initials =
    user === null
      ? 'TM'
      : user.name
          .split(' ')
          .map((part) => part[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();
  const isActive = (href: NavHref) => pathname === href || pathname.startsWith(`${href}/`);
  const visibleItems = items.filter((item) => item.enabled);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: wide ? spacing.xl : spacing.md,
            gap: wide ? spacing.lg : spacing.sm,
          },
        ]}
      >
        <View style={styles.brand}>
          <Image
            source={require('../../../assets/full-logo.png')}
            style={[styles.logo, wide ? null : styles.logoCompact]}
            resizeMode="contain"
            testID="app-logo"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.nav}
          contentContainerStyle={styles.navContent}
        >
          {visibleItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                testID={`nav-${item.label.toLowerCase()}`}
                onPress={() => navigate(item.href)}
                style={[styles.navItem, active ? styles.navItemActive : null]}
              >
                <Icon
                  name={item.icon}
                  size="sm"
                  color={active ? colors.primaryDark : colors.textMuted}
                />
                <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.user}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {wide ? (
            <View>
              <Text style={styles.userName}>{user?.name ?? roleText}</Text>
              <Text style={styles.userRole}>{roleText}</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          testID="sign-out-button"
          onPress={() => {
            void signOut();
          }}
          style={styles.signOut}
        >
          <Icon name="logout" size="md" color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
