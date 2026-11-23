import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { colors, spacing, typography } from '@/theme';
import { permissions } from '@/utils/permissions';

interface ManagementLink {
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly icon: IconName;
}

const links: readonly ManagementLink[] = [
  {
    label: 'Users',
    description: 'Create staff accounts and assign roles.',
    href: '/management/users',
    icon: 'users',
  },
  {
    label: 'Catalog',
    description: 'Manage sellable items, prices, and availability.',
    href: '/management/catalog',
    icon: 'food',
  },
  {
    label: 'Settings',
    description: 'Configure the service fee applied to new orders.',
    href: '/management/settings',
    icon: 'settings',
  },
  {
    label: 'Reports',
    description: 'Review sales summaries for a date range.',
    href: '/management/reports',
    icon: 'reports',
  },
];

export default function Management() {
  const { user } = useSession();
  const router = useRouter();

  if (!permissions.canManage(user)) {
    return <Redirect href="/" />;
  }

  return (
    <Screen scroll title="Management" subtitle="Administration tools">
      {links.map((link) => (
        <Card
          key={link.href}
          testID={`management-${link.label.toLowerCase()}-link`}
          onPress={() => router.push(link.href)}
          style={{ marginBottom: spacing.md }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name={link.icon} size="lg" color={colors.primaryDark} />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={[typography.subtitle, { color: colors.text }]}>{link.label}</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
                {link.description}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
