import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radii, typography } from '@/theme';

export interface QuantityStepperProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly label?: string;
  readonly testID?: string;
}

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabledButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.surfaceMuted,
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
    ...typography.subtitle,
  },
} as const;

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = 'Quantity',
  testID = 'quantity-stepper',
}: QuantityStepperProps) {
  const lowerBound = Math.max(1, Math.floor(min));
  const upperBound = max === undefined ? Number.MAX_SAFE_INTEGER : Math.max(lowerBound, Math.floor(max));
  const numericValue = Number.isFinite(value) ? Math.floor(value) : lowerBound;
  const current = Math.min(upperBound, Math.max(lowerBound, numericValue));
  const decreaseDisabled = current <= lowerBound;
  const increaseDisabled = current >= upperBound;

  return (
    <View testID={testID} style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        accessibilityState={{ disabled: decreaseDisabled }}
        disabled={decreaseDisabled}
        testID={`${testID}-decrease`}
        onPress={() => onChange(current - 1)}
        style={({ pressed }) => [
          styles.button,
          decreaseDisabled ? styles.disabledButton : null,
          { opacity: pressed && !decreaseDisabled ? 0.7 : 1 },
        ]}
      >
        <Icon
          name="remove"
          size="sm"
          color={decreaseDisabled ? colors.textMuted : colors.primaryDark}
        />
      </Pressable>
      <Text testID={`${testID}-value`} accessibilityLabel={label} style={[styles.value, { color: colors.text }]}>
        {current}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label.toLowerCase()}`}
        accessibilityState={{ disabled: increaseDisabled }}
        disabled={increaseDisabled}
        testID={`${testID}-increase`}
        onPress={() => onChange(current + 1)}
        style={({ pressed }) => [
          styles.button,
          increaseDisabled ? styles.disabledButton : null,
          { opacity: pressed && !increaseDisabled ? 0.7 : 1 },
        ]}
      >
        <Icon name="add" size="sm" color={increaseDisabled ? colors.textMuted : colors.primaryDark} />
      </Pressable>
    </View>
  );
}
