import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, spacing, typography } from '@/theme';

export interface ErrorBannerProps {
  readonly message: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly testID?: string;
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.7,
  },
  notPressed: {
    opacity: 1,
  },
  retryLabel: {
    color: colors.danger,
    ...typography.label,
  },
});

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  testID = 'error-banner',
}: ErrorBannerProps) {
  const retryStyle = ({ pressed }: { pressed: boolean }) => [
    styles.retry,
    pressed ? styles.pressed : styles.notPressed,
  ];

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
          style={retryStyle}
        >
          <Text style={styles.retryLabel}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
