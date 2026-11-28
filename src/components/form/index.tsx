import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Button, type ButtonProps } from '@/components/button';
import { Card } from '@/components/card';
import { useIsWideScreen } from '@/hooks/use-wide-screen';
import { layout, spacing } from '@/theme';

type ActionButtonProps = Omit<ButtonProps, 'label' | 'onPress' | 'fullWidth'>;

export interface FormProps {
  readonly children?: ReactNode;
  readonly submit: string;
  readonly onSubmit: () => void;
  readonly cancel?: string;
  readonly onCancel?: () => void;
  readonly submitButtonProps?: ActionButtonProps;
  readonly cancelButtonProps?: ActionButtonProps;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

const styles = {
  container: {
    alignSelf: 'center',
    width: '100%',
  },
  containerWide: {
    maxWidth: layout.formMaxWidth,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  leadingAction: {
    flex: 1,
    marginRight: spacing.sm,
  },
  trailingAction: {
    flex: 1,
  },
} as const;

export function Form({
  children,
  submit,
  onSubmit,
  cancel,
  onCancel,
  submitButtonProps,
  cancelButtonProps,
  style,
  testID = 'form',
}: FormProps) {
  const wide = useIsWideScreen();
  const hasCancel = cancel !== undefined && onCancel !== undefined;
  const {
    size: submitSize = 'md',
    testID: submitTestID = 'form-submit',
    ...submitProps
  } = submitButtonProps ?? {};
  const {
    variant: cancelVariant = 'secondary',
    testID: cancelTestID = 'form-cancel',
    ...cancelProps
  } = cancelButtonProps ?? {};

  const submitButton = (
    <Button
      {...submitProps}
      label={submit}
      onPress={onSubmit}
      fullWidth
      size={submitSize}
      testID={submitTestID}
    />
  );

  return (
    <Card
      testID={testID}
      style={[styles.container, wide ? styles.containerWide : null, style]}
    >
      {children}
      {hasCancel ? (
        <View style={styles.actions}>
          <View style={styles.leadingAction}>
            <Button
              {...cancelProps}
              label={cancel}
              onPress={onCancel}
              fullWidth
              variant={cancelVariant}
              testID={cancelTestID}
            />
          </View>
          <View style={styles.trailingAction}>{submitButton}</View>
        </View>
      ) : (
        <View style={styles.actions}>{submitButton}</View>
      )}
    </Card>
  );
}
