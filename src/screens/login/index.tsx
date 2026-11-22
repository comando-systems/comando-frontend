import { Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export default function Login() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        padding: spacing.xl,
      }}
    >
      <Text style={[typography.display, { color: colors.primary }]}>Comando</Text>
      <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
        Sign in to manage orders.
      </Text>
    </View>
  );
}
