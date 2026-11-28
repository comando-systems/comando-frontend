import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Form } from '@/components/form';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { PaymentEditor } from '@/components/payment-editor';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { OrderResponse } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { formatPriceInput } from '@/utils/money';
import { orderItemCountLabel } from '@/utils/order-display';
import {
  createPaymentRow,
  type PaymentDraftRow,
  paymentInputsFromRows,
  paymentMethodLabels,
  validatePaymentRows,
} from '@/utils/payments';
import { permissions } from '@/utils/permissions';

type PaymentAction = 'close' | 'request-payment' | 'reopen' | 'cancel' | null;

const styles = StyleSheet.create({
  spacingMd: {
    marginTop: spacing.md,
  },
  spacingLg: {
    marginTop: spacing.lg,
  },
  errorAbove: {
    marginBottom: spacing.lg,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemCount: {
    color: colors.textMuted,
    marginTop: spacing.md,
    ...typography.body,
  },
  savedLater: {
    color: colors.warning,
    marginTop: spacing.md,
    ...typography.caption,
  },
  labelText: {
    color: colors.text,
    ...typography.label,
  },
  recordedLabel: {
    color: colors.textMuted,
    ...typography.body,
  },
  changeLabel: {
    color: colors.textMuted,
    ...typography.caption,
  },
  restrictedText: {
    color: colors.textMuted,
    marginTop: spacing.md,
    ...typography.caption,
  },
});

function rowsFromOrder(order: OrderResponse): readonly PaymentDraftRow[] {
  if (order.totalCents === 0) {
    return [];
  }

  if (order.payments.length === 0) {
    return [createPaymentRow({ amountCents: formatPriceInput(order.totalCents) })];
  }

  return order.payments.map((payment, index) =>
    createPaymentRow({
      id: `existing-${index}`,
      method: payment.method,
      amountCents: formatPriceInput(payment.amountCents),
      receivedCents:
        payment.receivedCents === null ? '' : formatPriceInput(payment.receivedCents),
    }),
  );
}

export default function Payment() {
  const { user } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [rows, setRows] = useState<readonly PaymentDraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<PaymentAction>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const loadedOrder = await api.orders.get(orderId);
      setOrder(loadedOrder);
      setRows(rowsFromOrder(loadedOrder));
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      void loadOrder();
    }, [loadOrder]),
  );

  async function runAction(action: PaymentAction, request: () => Promise<OrderResponse>) {
    setBusy(action);
    setError(null);

    try {
      setOrder(await request());

      if (action === 'close' || action === 'cancel') {
        router.back();
      }
    } catch (actionError) {
      setError(toErrorMessage(actionError));
    } finally {
      setBusy(null);
    }
  }

  function handleClose() {
    if (order === null) {
      return;
    }

    const validationError = validatePaymentRows(rows, order.totalCents);

    if (validationError !== null) {
      setError(validationError);
      return;
    }

    const payments = paymentInputsFromRows(rows);
    void runAction('close', () => api.orders.close(order.id, { payments }));
  }

  if (loading) {
    return (
      <Screen title="Pagamento">
        <LoadingState message="Carregando detalhes do pagamento..." testID="payment-loading" />
      </Screen>
    );
  }

  if (order === null || orderId.length === 0) {
    return (
      <Screen title="Pagamento">
        <EmptyState
          title="Pedido não encontrado"
          description="Este pedido não está mais disponível."
          icon="receipt"
          actionLabel="Voltar às mesas"
          onAction={() => router.push('/tables')}
        />
        {error === null ? null : (
          <View style={styles.spacingLg}>
            <ErrorBanner message={error} onRetry={() => void loadOrder()} testID="payment-error" />
          </View>
        )}
      </Screen>
    );
  }

  const canClose = permissions.canCloseOrders(user);
  const canRequestPayment = permissions.canOpenTables(user);
  const canCancel = permissions.canCancelOrders(user);
  const isActive = order.status === 'OPEN' || order.status === 'AWAITING_PAYMENT';
  const actionDisabled = busy !== null;

  return (
    <Screen scroll title={order.tableCode ?? `Pedido ${order.id}`} subtitle="Pagamento">
      <View style={styles.content}>
        {error === null ? null : (
          <View style={styles.errorAbove}>
            <ErrorBanner message={error} onRetry={() => void loadOrder()} testID="payment-error" />
          </View>
        )}

        <Card testID="payment-order-summary">
          <View style={styles.summaryRow}>
            <OrderStatusBadge status={order.status} testID="payment-order-status" />
            <MoneyText cents={order.totalCents} size="lg" testID="payment-order-total" />
          </View>
          <Text style={styles.itemCount} testID="payment-item-count">
            {orderItemCountLabel(order)}
          </Text>
          {order.status === 'AWAITING_PAYMENT' ? (
            <Text style={styles.savedLater} testID="payment-saved-later">
              Este pedido foi salvo para pagamento posterior.
            </Text>
          ) : null}
        </Card>

        {order.payments.length === 0 ? null : (
          <Card testID="recorded-payments" style={styles.spacingMd}>
            <Text style={styles.labelText}>Pagamentos registrados</Text>
            {order.payments.map((payment, index) => (
              <View
                key={`${payment.method}-${index}`}
                style={styles.spacingMd}
                testID={`recorded-payment-${index}`}
              >
                <View style={styles.summaryRow}>
                  <Text style={styles.recordedLabel}>
                    {paymentMethodLabels[payment.method]}
                  </Text>
                  <MoneyText
                    cents={payment.amountCents}
                    size="sm"
                    testID={`recorded-amount-${index}`}
                  />
                </View>
                {payment.changeCents === null ? null : (
                  <View
                    style={styles.summaryRow}
                  >
                    <Text style={styles.changeLabel}>Troco</Text>
                    <MoneyText
                      cents={payment.changeCents}
                      size="sm"
                      testID={`recorded-change-${index}`}
                    />
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}

        {!isActive || !canClose ? null : (
          <Form
            testID="payment-form"
            submit="Fechar pedido"
            onSubmit={handleClose}
            submitButtonProps={{
              loading: busy === 'close',
              disabled: actionDisabled,
              icon: 'check',
              testID: 'payment-close-button',
            }}
            style={styles.spacingLg}
          >
            <PaymentEditor
              rows={rows}
              onRowsChange={setRows}
              totalCents={order.totalCents}
              disabled={actionDisabled}
            />
          </Form>
        )}

        {!isActive || !canRequestPayment ? null : (
          <View style={styles.spacingMd}>
            {order.status === 'OPEN' ? (
              <Button
                label="Solicitar pagamento"
                onPress={() => {
                  void runAction('request-payment', () => api.orders.requestPayment(order.id));
                }}
                loading={busy === 'request-payment'}
                disabled={actionDisabled}
                icon="payment"
                fullWidth
                testID="payment-request-button"
              />
            ) : (
              <Button
                label="Reabrir pedido"
                onPress={() => {
                  void runAction('reopen', () => api.orders.reopen(order.id));
                }}
                loading={busy === 'reopen'}
                disabled={actionDisabled}
                icon="back"
                fullWidth
                testID="payment-reopen-button"
              />
            )}
          </View>
        )}

        {!isActive || !canCancel ? null : (
          <View style={styles.spacingMd}>
            <Button
              label="Cancelar pedido"
              onPress={() => {
                void runAction('cancel', () => api.orders.cancel(order.id));
              }}
              loading={busy === 'cancel'}
              disabled={actionDisabled}
              variant="secondary"
              icon="close"
              fullWidth
              testID="payment-cancel-button"
            />
          </View>
        )}

        {!isActive || canClose || !canRequestPayment ? null : (
          <Text style={styles.restrictedText} testID="payment-close-restricted">
            Um administrador ou operador de caixa deve fechar este pedido.
          </Text>
        )}

        <View style={styles.spacingLg}>
          <Button
            label="Voltar"
            onPress={() => router.back()}
            variant="secondary"
            icon="back"
            fullWidth
            testID="payment-back-button"
          />
        </View>
      </View>
    </Screen>
  );
}
