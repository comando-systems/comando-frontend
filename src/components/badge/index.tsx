import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, spacing, typography } from '@/theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly icon?: IconName;
  readonly testID?: string;
}

const tones: Record<BadgeTone, { background: string; text: string }> = {
  neutral: { background: colors.surfaceMuted, text: colors.textMuted },
  success: { background: colors.successSoft, text: colors.success },
  warning: { background: colors.warningSoft, text: colors.warning },
  danger: { background: colors.dangerSoft, text: colors.danger },
  info: { background: colors.infoSoft, text: colors.info },
};

const styles = {
  base: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
} as const;

export function Badge({ label, tone = 'neutral', icon, testID = 'badge' }: BadgeProps) {
  const palette = tones[tone];

  return (
    <View testID={testID} style={[styles.base, { backgroundColor: palette.background }]}>
      {icon === undefined ? null : (
        <Icon name={icon} size="sm" color={palette.text} testID={`${testID}-icon`} />
      )}
      <Text
        style={[
          typography.caption,
          {
            color: palette.text,
            marginLeft: icon === undefined ? 0 : spacing.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
