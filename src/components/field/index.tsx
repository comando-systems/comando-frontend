import { Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, layout, radii, spacing, typography } from '@/theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  readonly label: string;
  readonly error?: string | null;
  readonly helper?: string;
  readonly icon?: IconName;
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly inputStyle?: StyleProp<TextStyle>;
}

const styles = {
  container: {
    maxWidth: layout.formMaxWidth,
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    color: colors.text,
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  message: {
    marginTop: spacing.xs,
  },
} as const;

export function Field({
  label,
  error = null,
  helper,
  icon,
  containerStyle,
  inputStyle,
  accessibilityLabel = label,
  ...inputProps
}: FieldProps) {
  const message = error ?? helper;
  const messageColor = error === null ? colors.textMuted : colors.danger;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[typography.label, styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          { borderColor: error === null ? colors.border : colors.danger },
        ]}
      >
        {icon === undefined ? null : (
          <View style={styles.icon}>
            <Icon name={icon} size="sm" color={colors.textMuted} testID="field-icon" />
          </View>
        )}
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={message ?? undefined}
          placeholderTextColor={inputProps.placeholderTextColor ?? colors.textMuted}
          style={[styles.input, inputStyle]}
        />
      </View>
      {message === undefined || message === null ? null : (
        <Text style={[typography.caption, styles.message, { color: messageColor }]}>{message}</Text>
      )}
    </View>
  );
}
