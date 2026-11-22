import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, spacing, typography } from '@/theme';

interface SectionPlaceholderProps {
  readonly title: string;
  readonly description: string;
}

export function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
      }}
    >
      <Icon name="info" size="lg" color={colors.primary} />
      <Text style={{ ...typography.title, color: colors.text, marginTop: spacing.lg }}>{title}</Text>
      <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' }}>
        {description}
      </Text>
    </View>
  );
}
