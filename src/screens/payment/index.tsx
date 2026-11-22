import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
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

function rowsFromOrder(order: OrderResponse): readonly PaymentDraftRow[] {
  if (order.payments.length === 0) {
    return [createPaymentRow({ amountCents: String(order.totalCents) })];
  }

  return order.payments.map((payment, index) =>
    createPaymentRow({
      id: `existing-${index}`,
      method: payment.method,
      amountCents: String(payment.amountCents),
      receivedCents: payment.receivedCents === null ? '' : String(payment.receivedCents),
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
      <Screen title="Payment">
        <LoadingState message="Loading payment details..." testID="payment-loading" />
      </Screen>
    );
  }

  if (order === null || orderId.length === 0) {
    return (
      <Screen title="Payment">
        <EmptyState
          title="Order not found"
          description="This order is no longer available."
          icon="receipt"
          actionLabel="Back to tables"
          onAction={() => router.push('/tables')}
        />
        {error === null ? null : (
          <View style={{ marginTop: spacing.lg }}>
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
    <Screen scroll title={order.tableCode ?? `Order ${order.id}`} subtitle="Payment">
      <View style={{ paddingBottom: spacing.xl }}>
        {error === null ? null : (
          <View style={{ marginBottom: spacing.lg }}>
            <ErrorBanner message={error} onRetry={() => void loadOrder()} testID="payment-error" />
          </View>
        )}

        <Card testID="payment-order-summary">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OrderStatusBadge status={order.status} testID="payment-order-status" />
            <MoneyText cents={order.totalCents} size="lg" testID="payment-order-total" />
          </View>
          <Text
            style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}
            testID="payment-item-count"
          >
            {orderItemCountLabel(order)}
          </Text>
          {order.status === 'AWAITING_PAYMENT' ? (
            <Text
              style={[typography.caption, { color: colors.warning, marginTop: spacing.md }]}
              testID="payment-saved-later"
            >
              This order is saved for later payment.
            </Text>
          ) : null}
        </Card>

        {order.payments.length === 0 ? null : (
          <Card testID="recorded-payments" style={{ marginTop: spacing.md }}>
            <Text style={[typography.label, { color: colors.text }]}>Recorded payments</Text>
            {order.payments.map((payment, index) => (
              <View
                key={`${payment.method}-${index}`}
                style={{ marginTop: spacing.md }}
                testID={`recorded-payment-${index}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[typography.body, { color: colors.textMuted }]}>
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
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Text style={[typography.caption, { color: colors.textMuted }]}>Change</Text>
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
          <View style={{ marginTop: spacing.lg }}>
            <PaymentEditor
              rows={rows}
              onRowsChange={setRows}
              totalCents={order.totalCents}
              disabled={actionDisabled}
            />
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label="Close order"
                onPress={handleClose}
                loading={busy === 'close'}
                disabled={actionDisabled}
                icon="check"
                fullWidth
                testID="payment-close-button"
              />
            </View>
          </View>
        )}

        {!isActive || !canRequestPayment ? null : (
          <View style={{ marginTop: spacing.md }}>
            {order.status === 'OPEN' ? (
              <Button
                label="Request payment"
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
                label="Reopen order"
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
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Cancel order"
              onPress={() => {
                void runAction('cancel', () => api.orders.cancel(order.id));
              }}
              loading={busy === 'cancel'}
              disabled={actionDisabled}
              variant="danger"
              icon="close"
              fullWidth
              testID="payment-cancel-button"
            />
          </View>
        )}

        {!isActive || canClose || !canRequestPayment ? null : (
          <Text
            style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}
            testID="payment-close-restricted"
          >
            An administrator or cashier must close this order.
          </Text>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="Back"
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
