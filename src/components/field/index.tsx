import { Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  readonly label: string;
  readonly error?: string | null;
  readonly helper?: string;
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly inputStyle?: StyleProp<TextStyle>;
}

const styles = {
  container: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.lg,
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
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={message ?? undefined}
        placeholderTextColor={inputProps.placeholderTextColor ?? colors.textMuted}
        style={[
          styles.input,
          { borderColor: error === null ? colors.border : colors.danger },
          inputStyle,
        ]}
      />
      {message === undefined || message === null ? null : (
        <Text style={[typography.caption, styles.message, { color: messageColor }]}>{message}</Text>
      )}
    </View>
  );
}
