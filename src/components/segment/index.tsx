import { Pressable, Text, View } from 'react-native';

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

const styles = {
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
  optionLabel: {
    ...typography.label,
  },
} as const;

export function Segment<T extends string>({
  options,
  value,
  onChange,
  label = 'Option',
  testID = 'segment',
}: SegmentProps<T>) {
  return (
    <View accessibilityLabel={label} testID={testID} style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = option.disabled === true;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            disabled={isDisabled}
            testID={`${testID}-${option.value}`}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected ? { backgroundColor: colors.surface } : null,
              isDisabled ? { opacity: 0.5 } : null,
              pressed && !isDisabled ? { opacity: 0.8 } : null,
            ]}
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
                {
                  color: isDisabled
                    ? colors.textMuted
                    : isSelected
                      ? colors.primaryDark
                      : colors.text,
                  marginLeft: option.icon === undefined ? 0 : spacing.xs,
                },
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
