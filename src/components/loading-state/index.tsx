import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export interface LoadingStateProps {
  readonly message?: string;
  readonly testID?: string;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  messageText: {
    color: colors.textMuted,
  },
});

export function LoadingState({ message, testID = 'loading-state' }: LoadingStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <ActivityIndicator color={colors.primary} testID={`${testID}-indicator`} />
      {message === undefined ? null : (
        <Text style={[typography.body, styles.message, styles.messageText]}>{message}</Text>
      )}
    </View>
  );
}
