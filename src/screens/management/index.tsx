import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { colors, spacing, typography } from '@/theme';
import { permissions } from '@/utils/permissions';

export default function Management() {
  const { user } = useSession();
  const router = useRouter();

  if (!permissions.canManage(user)) {
    return <Redirect href="/" />;
  }

  return (
    <Screen scroll title="Management" subtitle="Administration tools">
      <Card testID="management-users-link" onPress={() => router.push('/management/users')}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="users" size="lg" color={colors.primaryDark} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={[typography.subtitle, { color: colors.text }]}>Users</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
              Create staff accounts and assign roles.
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}
