import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { colors, spacing, typography } from '@/theme';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: IconName;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly testID?: string;
}

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xl,
  },
} as const;

export function EmptyState({
  title,
  description,
  icon = 'info',
  actionLabel,
  onAction,
  testID = 'empty-state',
}: EmptyStateProps) {
  const showAction = actionLabel !== undefined && onAction !== undefined;

  return (
    <View testID={testID} style={styles.container}>
      <Icon name={icon} size="lg" color={colors.primary} />
      <Text style={[typography.subtitle, styles.title, { color: colors.text }]}>{title}</Text>
      {description === undefined ? null : (
        <Text style={[typography.body, styles.description, { color: colors.textMuted }]}>
          {description}
        </Text>
      )}
      {showAction ? (
        <View style={styles.action}>
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
            testID={`${testID}-action`}
          />
        </View>
      ) : null}
    </View>
  );
}
