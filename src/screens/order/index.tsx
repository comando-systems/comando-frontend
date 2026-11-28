import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Icon } from '@/components/icon';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { OrderBuilder } from '@/components/order-builder';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { ItemResponse, OrderResponse, SettingsResponse } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { orderItemCountLabel, orderTableLabel } from '@/utils/order-display';
import { permissions } from '@/utils/permissions';

const styles = StyleSheet.create({
  errorBelow: {
    marginTop: spacing.lg,
  },
  errorAbove: {
    marginBottom: spacing.lg,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  metaText: {
    color: colors.textMuted,
    marginLeft: spacing.sm,
    ...typography.body,
  },
  warningText: {
    color: colors.warning,
    ...typography.caption,
  },
  spacingMd: {
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  halfSpaced: {
    marginRight: spacing.sm,
  },
  requestHalf: {
    marginLeft: spacing.sm,
  },
});

export default function Order() {
  const { user } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const orderId = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [catalog, setCatalog] = useState<readonly ItemResponse[]>([]);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [loadedOrder, itemPage, loadedSettings] = await Promise.all([
        api.orders.get(orderId),
        api.items.list({ pageSize: 100 }),
        api.settings.get(),
      ]);

      setOrder(loadedOrder);
      setCatalog(itemPage.data);
      setSettings(loadedSettings);
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

  async function runAction(action: () => Promise<OrderResponse>) {
    setActionBusy(true);
    setError(null);

    try {
      setOrder(await action());
    } catch (actionError) {
      setError(toErrorMessage(actionError));
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Pedido">
        <LoadingState message="Carregando pedido..." testID="order-loading" />
      </Screen>
    );
  }

  if (order === null || orderId.length === 0) {
    return (
      <Screen title="Pedido">
        <EmptyState
          title="Pedido não encontrado"
          description="Este pedido não está mais disponível."
          icon="receipt"
          actionLabel="Voltar às mesas"
          onAction={() => router.push('/tables')}
        />
        {error === null ? null : (
          <View style={styles.errorBelow}>
            <ErrorBanner message={error} onRetry={() => void loadOrder()} testID="order-error" />
          </View>
        )}
      </Screen>
    );
  }

  const canEdit = permissions.canEditTables(user) && order.status === 'OPEN';
  const canRequestPayment = permissions.canOpenTables(user) && order.status === 'OPEN';
  const canCancel =
    permissions.canCancelOrders(user) &&
    (order.status === 'OPEN' || order.status === 'AWAITING_PAYMENT');
  const canOpenPayment =
    permissions.canCloseOrders(user) &&
    (order.status === 'OPEN' || order.status === 'AWAITING_PAYMENT');

  return (
    <Screen
      scroll
      title={orderTableLabel(order) ?? `Pedido ${order.id}`}
      subtitle={order.label ?? undefined}
    >
      {error === null ? null : (
        <View style={styles.errorAbove}>
          <ErrorBanner message={error} onRetry={() => void loadOrder()} testID="order-error" />
        </View>
      )}

      <Card testID="order-summary">
        <View style={styles.summaryRow}>
          <OrderStatusBadge status={order.status} testID="order-status" />
          <MoneyText cents={order.totalCents} size="lg" testID="order-total" />
        </View>
        <View style={styles.metaRow}>
          <Icon name="receipt" size="sm" color={colors.primaryDark} />
          <Text style={styles.metaText} testID="order-item-count">
            {orderItemCountLabel(order)}
          </Text>
        </View>
        {order.status === 'AWAITING_PAYMENT' ? (
          <View style={styles.spacingMd}>
            <Text style={styles.warningText}>
              Os itens estão bloqueados enquanto o pagamento é solicitado.
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.spacingMd}>
        <OrderBuilder
          mode="order"
          order={order}
          onOrderChange={setOrder}
          catalog={catalog}
          settings={settings ?? undefined}
          canEdit={canEdit}
          onRetry={() => void loadOrder()}
        />
      </View>

      <View style={styles.actionRow}>
        <View style={[styles.flexOne, canRequestPayment ? styles.halfSpaced : null]}>
          <Button
            label="Voltar"
            onPress={() => router.back()}
            variant="secondary"
            icon="back"
            fullWidth
            testID="order-back"
          />
        </View>
        {canRequestPayment ? (
          <View style={[styles.flexOne, styles.requestHalf]}>
            <Button
              label="Salvar para depois"
              onPress={() => {
                void runAction(() => api.orders.requestPayment(order.id));
              }}
              loading={actionBusy}
              icon="payment"
              fullWidth
              testID="request-payment-button"
            />
          </View>
        ) : null}
      </View>

      {canOpenPayment ? (
        <View style={styles.spacingMd}>
          <Button
            label="Finalizar"
            onPress={() => router.push(`/orders/${order.id}/payment`)}
            variant="secondary"
            icon="payment"
            fullWidth
            testID="order-payment-button"
          />
        </View>
      ) : null}

      {canCancel ? (
        <View style={styles.spacingMd}>
          <Button
            label="Cancelar pedido"
            onPress={() => {
              void runAction(() => api.orders.cancel(order.id));
            }}
            variant="secondary"
            disabled={actionBusy}
            icon="close"
            fullWidth
            testID="cancel-order-button"
          />
        </View>
      ) : null}
    </Screen>
  );
}
