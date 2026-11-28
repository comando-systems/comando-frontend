import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { useIsWideScreen } from '@/hooks/use-wide-screen';
import { colors, layout, radii, spacing, typography } from '@/theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  readonly label: string;
  readonly error?: string | null;
  readonly helper?: string;
  readonly icon?: IconName;
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly inputStyle?: StyleProp<TextStyle>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  containerWide: {
    maxWidth: layout.formMaxWidth,
  },
  label: {
    marginBottom: spacing.xs,
  },
  labelText: {
    color: colors.text,
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
  inputWrapperError: {
    borderColor: colors.danger,
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
  messageMuted: {
    color: colors.textMuted,
  },
  messageError: {
    color: colors.danger,
  },
});

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
  const wide = useIsWideScreen();
  const message = error ?? helper;
  const messageColorStyle = error === null ? styles.messageMuted : styles.messageError;

  return (
    <View style={[styles.container, wide ? styles.containerWide : null, containerStyle]}>
      <Text style={[typography.label, styles.label, styles.labelText]}>{label}</Text>
      <View style={[styles.inputWrapper, error === null ? null : styles.inputWrapperError]}>
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
        <Text style={[typography.caption, styles.message, messageColorStyle]}>{message}</Text>
      )}
    </View>
  );
}
