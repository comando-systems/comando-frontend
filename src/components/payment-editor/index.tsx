import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { MoneyText } from '@/components/money-text';
import { Segment } from '@/components/segment';
import { getErrorMessage } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/types';
import { formatPriceInput, maskPriceInput, parsePriceToCents } from '@/utils/money';
import {
  createPaymentRow,
  type PaymentDraftRow,
  parseDraftCents,
  paymentDraftTotalCents,
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
    CASH: 'Dinheiro',
    DEBIT_CARD: 'Débito',
    CREDIT_CARD: 'Crédito',
    PIX: 'Pix',
    OTHER: 'Outro',
  }[method],
}));

const nonCashMethods: readonly PaymentMethod[] = ['DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'OTHER'];

const styles = StyleSheet.create({
  rowCard: {
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mutedCaption: {
    color: colors.textMuted,
  },
  section: {
    marginTop: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  summaryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  mutedLabel: {
    color: colors.textMuted,
  },
  statusMatch: {
    color: colors.success,
    marginLeft: spacing.sm,
  },
  statusMismatch: {
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  rows: {
    marginTop: spacing.md,
  },
});

function toDisplayAmount(value: string): string {
  const cents = parseDraftCents(value);
  return cents === null ? value : formatPriceInput(cents);
}

interface PaymentRowProps {
  readonly row: PaymentDraftRow;
  readonly index: number;
  readonly canRemove: boolean;
  readonly disabled: boolean;
  readonly remainingCents: number;
  readonly onRowsChange: (rows: readonly PaymentDraftRow[]) => void;
  readonly rows: readonly PaymentDraftRow[];
  readonly testID: string;
}

const PaymentRow = memo(function PaymentRow({
  row,
  index,
  canRemove,
  disabled,
  remainingCents,
  onRowsChange,
  rows,
  testID,
}: PaymentRowProps) {
  // Rows store integer cents; keep the raw text locally so partially typed
  // decimals such as "12." are not replaced by a formatted value mid-edit.
  const [amountText, setAmountText] = useState(() => toDisplayAmount(row.amountCents));
  const [receivedText, setReceivedText] = useState(() => toDisplayAmount(row.receivedCents));
  const amountRef = useRef(row.amountCents);
  const receivedRef = useRef(row.receivedCents);

  useEffect(() => {
    if (row.amountCents !== amountRef.current) {
      amountRef.current = row.amountCents;
      setAmountText(toDisplayAmount(row.amountCents));
    }
  }, [row.amountCents]);

  useEffect(() => {
    if (row.receivedCents !== receivedRef.current) {
      receivedRef.current = row.receivedCents;
      setReceivedText(toDisplayAmount(row.receivedCents));
    }
  }, [row.receivedCents]);

  const updateRow = useCallback(
    (patch: Partial<PaymentDraftRow>) => {
      onRowsChange(rows.map((entry) => (entry.id === row.id ? { ...entry, ...patch } : entry)));
    },
    [onRowsChange, row.id, rows],
  );

  const commitAmountText = useCallback(
    (text: string) => {
      const masked = maskPriceInput(text);
      const cents = parsePriceToCents(masked);
      const next = cents === null ? '' : String(cents);

      setAmountText(masked);
      amountRef.current = next;
      updateRow({ amountCents: next });
    },
    [updateRow],
  );

  const commitReceivedText = useCallback(
    (text: string) => {
      const masked = maskPriceInput(text);
      const cents = parsePriceToCents(masked);
      const next = cents === null ? '' : String(cents);

      setReceivedText(masked);
      receivedRef.current = next;
      updateRow({ receivedCents: next });
    },
    [updateRow],
  );

  const changeMethod = useCallback(
    (method: PaymentMethod) => {
      const currentCents = parseDraftCents(row.amountCents);
      const isEmpty = currentCents === null || currentCents === 0;
      const shouldPrefill = nonCashMethods.includes(method) && isEmpty && remainingCents > 0;
      const nextAmount = shouldPrefill ? String(remainingCents) : row.amountCents;

      if (nextAmount !== row.amountCents) {
        amountRef.current = nextAmount;
        setAmountText(toDisplayAmount(nextAmount));
      }

      updateRow({
        method,
        amountCents: nextAmount,
        receivedCents: method === 'CASH' ? row.receivedCents : '',
      });
    },
    [remainingCents, row.amountCents, row.receivedCents, updateRow],
  );

  return (
    <Card testID={`${testID}-row-${index}`} style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <Text style={[typography.caption, styles.mutedCaption]}>{`Pagamento ${index + 1}`}</Text>
        <Button
          label="Remover"
          onPress={() => onRowsChange(rows.filter((entry) => entry.id !== row.id))}
          variant="tertiary"
          disabled={disabled || !canRemove}
          testID={`${testID}-remove-${index}`}
        />
      </View>
      <View style={styles.section}>
        <Segment
          label="Forma de pagamento"
          value={row.method}
          onChange={changeMethod}
          options={methodOptions}
          testID={`${testID}-method-${index}`}
        />
      </View>
      <View style={styles.section}>
        <Field
          label="Valor"
          value={amountText}
          onChangeText={commitAmountText}
          onBlur={() => setAmountText(toDisplayAmount(amountRef.current))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          editable={!disabled}
          testID={`${testID}-amount-${index}`}
        />
      </View>
      {row.method === 'CASH' ? (
        <View style={styles.section}>
          <Field
            label="Valor recebido (opcional)"
            value={receivedText}
            onChangeText={commitReceivedText}
            onBlur={() => setReceivedText(toDisplayAmount(receivedRef.current))}
            placeholder="0.00"
            keyboardType="decimal-pad"
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
  const isCredit = totalCents < 0;

  const statusLabel = isCredit
    ? getErrorMessage('NEGATIVE_TOTAL')
    : remainingCents === 0
      ? 'O total dos pagamentos é igual ao total do pedido.'
      : remainingCents > 0
        ? 'O total dos pagamentos é menor que o total do pedido.'
        : 'O total dos pagamentos é maior que o total do pedido.';

  function addPayment() {
    const prefillCents = Math.max(0, remainingCents);
    onRowsChange([
      ...rows,
      createPaymentRow({ amountCents: prefillCents > 0 ? String(prefillCents) : '' }),
    ]);
  }

  return (
    <View testID={testID}>
      <Card testID={`${testID}-summary`}>
        <View style={styles.summaryHeader}>
          <Text style={[typography.label, styles.mutedLabel]}>Total do pedido</Text>
          <MoneyText cents={totalCents} size="md" testID={`${testID}-total`} />
        </View>
        <View style={styles.summaryRow}>
          <Text style={[typography.label, styles.mutedLabel]}>Valor informado</Text>
          <MoneyText cents={enteredCents} size="md" testID={`${testID}-entered`} />
        </View>
        <View style={styles.summaryStatusRow}>
          <Icon
            name={remainingCents === 0 && !isCredit ? 'check' : 'payment'}
            size="sm"
            color={remainingCents === 0 && !isCredit ? colors.success : colors.warning}
          />
          <Text
            style={[
              typography.caption,
              remainingCents === 0 && !isCredit ? styles.statusMatch : styles.statusMismatch,
            ]}
            testID={`${testID}-status`}
          >
            {statusLabel}
          </Text>
        </View>
      </Card>

      {rows.length === 0 ? null : (
        <View style={styles.rows}>
          {rows.map((row, index) => (
            <PaymentRow
              key={row.id}
              row={row}
              index={index}
              rows={rows}
              canRemove={rows.length > 1}
              disabled={disabled}
              remainingCents={remainingCents}
              onRowsChange={onRowsChange}
              testID={testID}
            />
          ))}
        </View>
      )}

      <Button
        label="Adicionar pagamento"
        onPress={addPayment}
        variant="secondary"
        disabled={disabled || isCredit}
        icon="add"
        fullWidth
        testID={`${testID}-add`}
      />
    </View>
  );
}
