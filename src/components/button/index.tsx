import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { useIsWideScreen } from '@/hooks/use-wide-screen';
import { colors, layout, radii, spacing, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly icon?: IconName;
  readonly iconPosition?: 'left' | 'right';
  readonly testID?: string;
}

const palettes: Record<ButtonVariant, { background: string; text: string; border: string }> = {
  primary: {
    background: colors.primary,
    text: colors.white,
    border: colors.primary,
  },
  secondary: {
    background: 'transparent',
    text: colors.primaryDark,
    border: colors.primary,
  },
  tertiary: {
    background: 'transparent',
    text: colors.primaryDark,
    border: 'transparent',
  },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  fullWidthWide: {
    maxWidth: layout.formMaxWidth,
  },
  sizeMd: {
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  sizeLg: {
    height: 52,
    paddingHorizontal: spacing.xl,
  },
  surfacePrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  surfaceSecondary: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  surfaceTertiary: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  surfaceDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  notPressed: {
    opacity: 1,
  },
  labelPrimary: {
    color: colors.white,
  },
  labelSecondary: {
    color: colors.primaryDark,
  },
  labelTertiary: {
    color: colors.primaryDark,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  labelLeadingSpacing: {
    marginLeft: spacing.sm,
  },
  labelTrailingSpacing: {
    marginRight: spacing.sm,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const surfaceStyles: Record<ButtonVariant, ViewStyle> = {
  primary: styles.surfacePrimary,
  secondary: styles.surfaceSecondary,
  tertiary: styles.surfaceTertiary,
};

const labelColorStyles: Record<ButtonVariant, TextStyle> = {
  primary: styles.labelPrimary,
  secondary: styles.labelSecondary,
  tertiary: styles.labelTertiary,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  testID = 'button',
}: ButtonProps) {
  const wide = useIsWideScreen();
  const isDisabled = disabled || loading;
  const palette = palettes[variant];
  const iconColor = isDisabled ? colors.textMuted : palette.text;
  const leadingIcon =
    icon === undefined || iconPosition === 'right' ? null : (
      <Icon name={icon} size="sm" color={iconColor} testID={`${testID}-icon`} />
    );
  const trailingIcon =
    icon === undefined || iconPosition === 'left' ? null : (
      <Icon name={icon} size="sm" color={iconColor} testID={`${testID}-icon`} />
    );
  const pressableStyle = ({ pressed }: { pressed: boolean }) => [
    styles.base,
    sizeStyles[size],
    fullWidth ? [styles.fullWidth, wide ? styles.fullWidthWide : null] : null,
    isDisabled ? styles.surfaceDisabled : surfaceStyles[variant],
    pressed && !isDisabled ? styles.pressed : styles.notPressed,
  ];
  const labelStyle = [
    typography.label,
    isDisabled ? styles.labelDisabled : labelColorStyles[variant],
    leadingIcon === null ? null : styles.labelLeadingSpacing,
    trailingIcon === null ? null : styles.labelTrailingSpacing,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      testID={testID}
      onPress={onPress}
      style={pressableStyle}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} testID={`${testID}-spinner`} />
      ) : (
        <>
          {leadingIcon}
          <Text style={labelStyle}>{label}</Text>
          {trailingIcon}
        </>
      )}
    </Pressable>
  );
}
