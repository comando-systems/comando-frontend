import { ActivityIndicator, Pressable, Text } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, layout, radii, spacing, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
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
  danger: {
    background: colors.danger,
    text: colors.white,
    border: colors.danger,
  },
  ghost: {
    background: 'transparent',
    text: colors.primaryDark,
    border: 'transparent',
  },
};

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number }> = {
  md: { height: 44, paddingHorizontal: spacing.lg },
  lg: { height: 52, paddingHorizontal: spacing.xl },
};

const styles = {
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
  },
  fullWidth: {
    maxWidth: layout.formMaxWidth,
    width: '100%',
  },
} as const;

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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        fullWidth ? styles.fullWidth : null,
        {
          backgroundColor: isDisabled ? colors.surfaceMuted : palette.background,
          borderColor: isDisabled ? colors.border : palette.border,
          opacity: pressed && !isDisabled ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} testID={`${testID}-spinner`} />
      ) : (
        <>
          {leadingIcon}
          <Text
            style={[
              typography.label,
              {
                color: isDisabled ? colors.textMuted : palette.text,
                marginLeft: leadingIcon === null ? 0 : spacing.sm,
                marginRight: trailingIcon === null ? 0 : spacing.sm,
              },
            ]}
          >
            {label}
          </Text>
          {trailingIcon}
        </>
      )}
    </Pressable>
  );
}
