import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

export interface CardProps {
  readonly children: ReactNode;
  readonly onPress?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.8,
  },
  notPressed: {
    opacity: 1,
  },
});

export function Card({ children, onPress, style, testID = 'card' }: CardProps) {
  if (onPress === undefined) {
    return (
      <View testID={testID} style={[styles.base, style]}>
        {children}
      </View>
    );
  }

  const pressableStyle = ({ pressed }: { pressed: boolean }) => [
    styles.base,
    style,
    pressed ? styles.pressed : styles.notPressed,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={pressableStyle}
    >
      {children}
    </Pressable>
  );
}
