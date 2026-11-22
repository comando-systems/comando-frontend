import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

export interface CardProps {
  readonly children: ReactNode;
  readonly onPress?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

const styles = {
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
} as const;

export function Card({ children, onPress, style, testID = 'card' }: CardProps) {
  if (onPress === undefined) {
    return (
      <View testID={testID} style={[styles.base, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.base, style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
