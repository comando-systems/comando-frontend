import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, spacing, typography } from '@/theme';

export interface SegmentOption<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly icon?: IconName;
  readonly disabled?: boolean;
}

export interface SegmentProps<T extends string> {
  readonly options: readonly SegmentOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label?: string;
  readonly testID?: string;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  selectedOption: {
    backgroundColor: colors.surface,
  },
  disabledOption: {
    opacity: 0.5,
  },
  pressedOption: {
    opacity: 0.8,
  },
  optionLabel: {
    ...typography.label,
  },
  labelSelected: {
    color: colors.primaryDark,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  labelIdle: {
    color: colors.text,
  },
  labelWithIcon: {
    marginLeft: spacing.xs,
  },
  labelWithoutIcon: {
    marginLeft: 0,
  },
});

export function Segment<T extends string>({
  options,
  value,
  onChange,
  label = 'Opção',
  testID = 'segment',
}: SegmentProps<T>) {
  return (
    <View accessibilityLabel={label} testID={testID} style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = option.disabled === true;
        const optionStyle = ({ pressed }: { pressed: boolean }) => [
          styles.option,
          isSelected ? styles.selectedOption : null,
          isDisabled ? styles.disabledOption : null,
          pressed && !isDisabled ? styles.pressedOption : null,
        ];
        const labelColorStyle = isDisabled
          ? styles.labelDisabled
          : isSelected
            ? styles.labelSelected
            : styles.labelIdle;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            disabled={isDisabled}
            testID={`${testID}-${option.value}`}
            onPress={() => onChange(option.value)}
            style={optionStyle}
          >
            {option.icon === undefined ? null : (
              <Icon
                name={option.icon}
                size="sm"
                color={isSelected ? colors.primaryDark : colors.textMuted}
              />
            )}
            <Text
              style={[
                styles.optionLabel,
                labelColorStyle,
                option.icon === undefined ? styles.labelWithoutIcon : styles.labelWithIcon,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
