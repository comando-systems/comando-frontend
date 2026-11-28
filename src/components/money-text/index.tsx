import { Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { colors, typography } from '@/theme';
import { formatMoney } from '@/utils/money';

export type MoneyTextSize = 'sm' | 'md' | 'lg';

export interface MoneyTextProps {
  readonly cents: number;
  readonly size?: MoneyTextSize;
  readonly color?: string;
  readonly style?: StyleProp<TextStyle>;
  readonly testID?: string;
}

const sizeStyles: Record<MoneyTextSize, TextStyle> = {
  sm: typography.label,
  md: typography.subtitle,
  lg: typography.display,
};

export function MoneyText({
  cents,
  size = 'md',
  color = colors.text,
  style,
  testID = 'money-text',
}: MoneyTextProps) {
  const colorStyle = { color };

  return (
    <Text testID={testID} style={[sizeStyles[size], colorStyle, style]}>
      {formatMoney(cents)}
    </Text>
  );
}
