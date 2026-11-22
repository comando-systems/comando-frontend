import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, spacing, typography } from '@/theme';

export interface ErrorBannerProps {
  readonly message: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly testID?: string;
}

const styles = {
  container: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  message: {
    flex: 1,
    marginHorizontal: spacing.sm,
    color: colors.danger,
  },
  retry: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  retryLabel: {
    color: colors.danger,
    ...typography.label,
  },
} as const;

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
  testID = 'error-banner',
}: ErrorBannerProps) {
  return (
    <View testID={testID} style={styles.container}>
      <Icon name="warning" size="sm" color={colors.danger} />
      <Text style={[typography.body, styles.message]}>{message}</Text>
      {onRetry === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          testID={`${testID}-retry`}
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.retryLabel}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
