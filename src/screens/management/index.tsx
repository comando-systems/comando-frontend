import { Redirect, useRouter, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { colors, spacing, typography } from '@/theme';
import { permissions } from '@/utils/permissions';

interface ManagementLink {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly href: Href;
  readonly icon: IconName;
}

const links: readonly ManagementLink[] = [
  {
    id: 'users',
    label: 'Usuários',
    description: 'Crie contas da equipe e atribua perfis de acesso.',
    href: '/management/users',
    icon: 'users',
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    description: 'Gerencie itens à venda, preços e disponibilidade.',
    href: '/management/catalog',
    icon: 'food',
  },
  {
    id: 'settings',
    label: 'Configurações',
    description: 'Configure a taxa de serviço aplicada a novos pedidos.',
    href: '/management/settings',
    icon: 'settings',
  },
  {
    id: 'reports',
    label: 'Relatórios',
    description: 'Consulte resumos de vendas por período.',
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
    <Screen scroll title="Gerenciamento" subtitle="Ferramentas de administração">
      {links.map((link) => (
        <Card
          key={link.id}
          testID={`management-${link.id}-link`}
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
