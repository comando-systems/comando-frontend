import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { MoneyText } from '@/components/money-text';
import { Segment } from '@/components/segment';
import { colors, spacing, typography } from '@/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/types';
import {
  createPaymentRow,
  type PaymentDraftRow,
  paymentDraftTotalCents,
  paymentMethodLabels,
} from '@/utils/payments';

export interface PaymentEditorProps {
  readonly rows: readonly PaymentDraftRow[];
  readonly onRowsChange: (rows: readonly PaymentDraftRow[]) => void;
  readonly totalCents: number;
  readonly disabled?: boolean;
  readonly testID?: string;
}

const methodOptions = PAYMENT_METHODS.map((method) => ({
  value: method,
  label: {
    CASH: 'Cash',
    DEBIT_CARD: 'Debit',
    CREDIT_CARD: 'Credit',
    PIX: 'Pix',
    OTHER: 'Other',
  }[method],
}));

interface PaymentRowProps {
  readonly row: PaymentDraftRow;
  readonly index: number;
  readonly canRemove: boolean;
  readonly disabled: boolean;
  readonly onRowsChange: (rows: readonly PaymentDraftRow[]) => void;
  readonly rows: readonly PaymentDraftRow[];
  readonly testID: string;
}

const PaymentRow = memo(function PaymentRow({
  row,
  index,
  canRemove,
  disabled,
  onRowsChange,
  rows,
  testID,
}: PaymentRowProps) {
  const updateRow = useCallback(
    (patch: Partial<PaymentDraftRow>) => {
      onRowsChange(rows.map((entry) => (entry.id === row.id ? { ...entry, ...patch } : entry)));
    },
    [onRowsChange, row.id, rows],
  );

  const changeMethod = useCallback(
    (method: PaymentMethod) => {
      updateRow({
        method,
        receivedCents: method === 'CASH' ? row.receivedCents : '',
      });
    },
    [row.receivedCents, updateRow],
  );

  return (
    <Card testID={`${testID}-row-${index}`} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.label, { color: colors.text }]}>Payment {index + 1}</Text>
        <Button
          label="Remove"
          onPress={() => onRowsChange(rows.filter((entry) => entry.id !== row.id))}
          variant="danger"
          disabled={disabled || !canRemove}
          testID={`${testID}-remove-${index}`}
        />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Segment
          label="Payment method"
          value={row.method}
          onChange={changeMethod}
          options={methodOptions}
          testID={`${testID}-method-${index}`}
        />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Field
          label="Amount (cents)"
          value={row.amountCents}
          onChangeText={(amountCents) => updateRow({ amountCents })}
          placeholder="0"
          keyboardType="number-pad"
          editable={!disabled}
          testID={`${testID}-amount-${index}`}
        />
      </View>
      {row.method === 'CASH' ? (
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Amount received (cents, optional)"
            value={row.receivedCents}
            onChangeText={(receivedCents) => updateRow({ receivedCents })}
            placeholder="0"
            keyboardType="number-pad"
            editable={!disabled}
            testID={`${testID}-received-${index}`}
          />
        </View>
      ) : null}
    </Card>
  );
});

export function PaymentEditor({
  rows,
  onRowsChange,
  totalCents,
  disabled = false,
  testID = 'payment-editor',
}: PaymentEditorProps) {
  const enteredCents = paymentDraftTotalCents(rows);
  const remainingCents = totalCents - enteredCents;

  const statusLabel =
    remainingCents === 0
      ? 'Payment total matches the order total.'
      : remainingCents > 0
        ? 'Payment total is below the order total.'
        : 'Payment total is above the order total.';

  return (
    <View testID={testID}>
      <Card testID={`${testID}-summary`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[typography.label, { color: colors.textMuted }]}>Order total</Text>
          <MoneyText cents={totalCents} size="md" testID={`${testID}-total`} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.md,
          }}
        >
          <Text style={[typography.label, { color: colors.textMuted }]}>Amount entered</Text>
          <MoneyText cents={enteredCents} size="md" testID={`${testID}-entered`} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
          <Icon
            name={remainingCents === 0 ? 'check' : 'payment'}
            size="sm"
            color={remainingCents === 0 ? colors.success : colors.warning}
          />
          <Text
            style={[
              typography.caption,
              {
                color: remainingCents === 0 ? colors.success : colors.warning,
                marginLeft: spacing.sm,
              },
            ]}
            testID={`${testID}-status`}
          >
            {statusLabel}
          </Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Split payments</Text>
        <Text
          style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}
        >
          {`Available methods: ${PAYMENT_METHODS.map((method) => paymentMethodLabels[method]).join(', ')}.`}
        </Text>
      </View>

      <View style={{ marginTop: spacing.md }}>
        {rows.map((row, index) => (
          <PaymentRow
            key={row.id}
            row={row}
            index={index}
            rows={rows}
            canRemove={rows.length > 1}
            disabled={disabled}
            onRowsChange={onRowsChange}
            testID={testID}
          />
        ))}
      </View>

      <Button
        label="Add payment"
        onPress={() => onRowsChange([...rows, createPaymentRow()])}
        variant="secondary"
        disabled={disabled}
        icon="add"
        fullWidth
        testID={`${testID}-add`}
      />
    </View>
  );
}
