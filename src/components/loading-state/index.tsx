import { ActivityIndicator, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export interface LoadingStateProps {
  readonly message?: string;
  readonly testID?: string;
}

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
} as const;

export function LoadingState({ message, testID = 'loading-state' }: LoadingStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <ActivityIndicator color={colors.primary} testID={`${testID}-indicator`} />
      {message === undefined ? null : (
        <Text style={[typography.body, styles.message, { color: colors.textMuted }]}>{message}</Text>
      )}
    </View>
  );
}
