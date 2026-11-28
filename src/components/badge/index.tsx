import { StyleSheet, Text, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

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

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  toneNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  toneSuccess: {
    backgroundColor: colors.successSoft,
  },
  toneWarning: {
    backgroundColor: colors.warningSoft,
  },
  toneDanger: {
    backgroundColor: colors.dangerSoft,
  },
  toneInfo: {
    backgroundColor: colors.infoSoft,
  },
  textNeutral: {
    color: colors.textMuted,
  },
  textSuccess: {
    color: colors.success,
  },
  textWarning: {
    color: colors.warning,
  },
  textDanger: {
    color: colors.danger,
  },
  textInfo: {
    color: colors.info,
  },
  labelWithIcon: {
    marginLeft: spacing.xs,
  },
  labelWithoutIcon: {
    marginLeft: 0,
  },
});

const toneStyles: Record<BadgeTone, ViewStyle> = {
  neutral: styles.toneNeutral,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  info: styles.toneInfo,
};

const textStyles: Record<BadgeTone, TextStyle> = {
  neutral: styles.textNeutral,
  success: styles.textSuccess,
  warning: styles.textWarning,
  danger: styles.textDanger,
  info: styles.textInfo,
};

export function Badge({ label, tone = 'neutral', icon, testID = 'badge' }: BadgeProps) {
  const palette = tones[tone];

  return (
    <View testID={testID} style={[styles.base, toneStyles[tone]]}>
      {icon === undefined ? null : (
        <Icon name={icon} size="sm" color={palette.text} testID={`${testID}-icon`} />
      )}
      <Text
        style={[
          typography.caption,
          textStyles[tone],
          icon === undefined ? styles.labelWithoutIcon : styles.labelWithIcon,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
