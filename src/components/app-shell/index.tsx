import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useSession } from '@/providers/session-provider';
import { colors, fonts, radii, spacing, typography } from '@/theme';
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

const WIDE_HEADER_WIDTH = 700;

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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandName: {
    color: colors.primaryDark,
    fontFamily: fonts.mono,
    ...typography.title,
    marginLeft: spacing.sm,
  },
  userName: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  headerNav: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: spacing.md,
  },
  headerNavItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerNavLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    ...typography.label,
  },
  headerNavLabelActive: {
    color: colors.primaryDark,
  },
  headerNavUnderline: {
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
  },
  signOut: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  bottomNav: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  bottomNavItem: {
    alignItems: 'center',
    borderRadius: radii.md,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  bottomNavItemActive: {
    backgroundColor: colors.primarySoft,
  },
  bottomNavLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  bottomNavLabelActive: {
    color: colors.primaryDark,
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
  const wideHeader = width >= WIDE_HEADER_WIDTH;

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

  const isActive = (href: NavHref) => pathname === href || pathname.startsWith(`${href}/`);
  const visibleItems = items.filter((item) => item.enabled);

  const headerNav = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.headerNav}>
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
            style={[styles.headerNavItem, active ? styles.headerNavUnderline : null]}
          >
            <Text style={[styles.headerNavLabel, active ? styles.headerNavLabelActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const bottomNav = (
    <View
      style={[
        styles.bottomNav,
        { paddingBottom: insets.bottom + spacing.sm },
      ]}
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
            style={[styles.bottomNavItem, active ? styles.bottomNavItemActive : null]}
          >
            <Icon
              name={item.icon}
              size="sm"
              color={active ? colors.primaryDark : colors.textMuted}
            />
            <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Icon name="food" size="sm" color={colors.white} />
            </View>
            <Text style={styles.brandName}>Comando</Text>
          </View>
          {wideHeader ? null : (
            <Text style={styles.userName}>{user?.name ?? roleText}</Text>
          )}
        </View>
        {wideHeader ? headerNav : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          testID="sign-out-button"
          onPress={() => {
            void signOut();
          }}
          style={styles.signOut}
        >
          <Icon name="logout" size="md" color={colors.primaryDark} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>{children}</View>

      {wideHeader ? null : bottomNav}
    </View>
  );
}
