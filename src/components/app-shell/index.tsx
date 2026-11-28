import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useIsWideScreen } from '@/hooks/use-wide-screen';
import { useSession } from '@/providers/session-provider';
import { colors, radii, spacing, typography } from '@/theme';
import { ROLE_CODES, type RoleCode } from '@/types';
import { permissions } from '@/utils/permissions';

type NavHref = '/tables' | '/counter' | '/history' | '/management';

interface NavItem {
  readonly id: string;
  readonly href: NavHref;
  readonly label: string;
  readonly icon: IconName;
  readonly enabled: boolean;
}

const TAB_BAR_HEIGHT = 56;

const roleLabels: Record<RoleCode, string> = {
  ADMIN: 'Administrador',
  CASHIER: 'Caixa',
  SERVER: 'Garçom',
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
    width: 40,
  },
  logoCompact: {
    height: 32,
    width: 32,
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
  content: {
    flex: 1,
  },
  contentMobile: {
    paddingBottom: TAB_BAR_HEIGHT,
  },
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
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
  const wide = useIsWideScreen();

  const items: readonly NavItem[] = [
    {
      id: 'tables',
      href: '/tables',
      label: 'Mesas',
      icon: 'table',
      enabled: permissions.canUseTables(user),
    },
    {
      id: 'counter',
      href: '/counter',
      label: 'Balcão',
      icon: 'counter',
      enabled: permissions.canUseCounter(user),
    },
    {
      id: 'history',
      href: '/history',
      label: 'Histórico',
      icon: 'history',
      enabled: permissions.canViewHistory(user),
    },
    {
      id: 'management',
      href: '/management',
      label: 'Gerenciamento',
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
      ? 'Membro da equipe'
      : ROLE_CODES.filter((role) => user.roles[role] === role)
          .map((role) => roleLabels[role])
          .join(' · ');
  const initials =
    user === null
      ? 'ME'
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
            gap: wide ? spacing.lg : spacing.sm,
            justifyContent: wide ? 'flex-start' : 'space-between',
            paddingHorizontal: wide ? spacing.xl : spacing.md,
            paddingTop: insets.top + spacing.sm,
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

        {wide ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.nav}
            contentContainerStyle={styles.navContent}
            testID="header-nav"
          >
            {visibleItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  testID={`nav-${item.id}`}
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
        ) : null}

        {wide ? (
          <View style={styles.user}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.name ?? roleText}</Text>
              <Text style={styles.userRole}>{roleText}</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair"
          testID="sign-out-button"
          onPress={() => {
            void signOut();
          }}
          style={styles.signOut}
        >
          <Icon name="logout" size="md" color={colors.textMuted} />
        </Pressable>
      </View>

      <View
        testID="app-shell-content"
        style={[
          styles.content,
          wide
            ? null
            : [styles.contentMobile, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }],
        ]}
      >
        {children}
      </View>

      {wide ? null : (
        <View testID="bottom-tab-bar" style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          {visibleItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                testID={`nav-${item.id}`}
                onPress={() => navigate(item.href)}
                style={[styles.tab, active ? styles.tabActive : null]}
              >
                <Icon
                  name={item.icon}
                  size="md"
                  color={active ? colors.primaryDark : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
