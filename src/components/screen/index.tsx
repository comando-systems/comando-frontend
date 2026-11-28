import { useContext } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

export interface ScreenProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly scroll?: boolean;
  readonly topInset?: boolean;
  readonly bottomInset?: boolean;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  titleText: {
    color: colors.text,
  },
  subtitleText: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export function Screen({
  children,
  title,
  subtitle,
  action,
  scroll = false,
  topInset = false,
  bottomInset = false,
  contentStyle,
  testID = 'screen',
}: ScreenProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const paddingTop = topInset ? insets.top + spacing.lg : spacing.lg;
  const paddingBottom = bottomInset ? insets.bottom + spacing.xl : spacing.xl;
  const topPaddingStyle = { paddingTop };
  const bottomPaddingStyle = { paddingBottom };

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle, bottomPaddingStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentStyle, bottomPaddingStyle]}>{children}</View>
  );

  return (
    <View testID={testID} style={[styles.container, topPaddingStyle]}>
      {title === undefined && subtitle === undefined && action === undefined ? null : (
        <View style={styles.header}>
          {title === undefined ? null : (
            <Text style={[typography.title, styles.titleText]}>{title}</Text>
          )}
          {subtitle === undefined ? null : (
            <Text style={[typography.body, styles.subtitleText]}>{subtitle}</Text>
          )}
          {action}
        </View>
      )}
      {content}
    </View>
  );
}
