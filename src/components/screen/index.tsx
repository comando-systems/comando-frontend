import { useContext } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
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

const styles = {
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
} as const;

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

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle, { paddingBottom }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, contentStyle, { paddingBottom }]}>{children}</View>
  );

  return (
    <View testID={testID} style={[styles.container, { paddingTop }]}>
      {title === undefined && subtitle === undefined && action === undefined ? null : (
        <View style={styles.header}>
          {title === undefined ? null : (
            <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
          )}
          {subtitle === undefined ? null : (
            <Text
              style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}
            >
              {subtitle}
            </Text>
          )}
          {action}
        </View>
      )}
      {content}
    </View>
  );
}
