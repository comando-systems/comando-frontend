import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

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
import { orderItemCountLabel } from '@/utils/order-display';
import { permissions } from '@/utils/permissions';

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
          <View style={{ marginTop: spacing.lg }}>
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
    <Screen title={order.tableCode ?? `Pedido ${order.id}`} subtitle={order.label ?? undefined}>
      <View style={{ flex: 1, paddingBottom: spacing.lg }}>
        {error === null ? null : (
          <View style={{ marginBottom: spacing.lg }}>
            <ErrorBanner message={error} onRetry={() => void loadOrder()} testID="order-error" />
          </View>
        )}

        <Card testID="order-summary">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OrderStatusBadge status={order.status} testID="order-status" />
            <MoneyText cents={order.totalCents} size="lg" testID="order-total" />
          </View>
          <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="receipt" size="sm" color={colors.primaryDark} />
            <Text
              style={[typography.body, { color: colors.textMuted, marginLeft: spacing.sm }]}
              testID="order-item-count"
            >
              {orderItemCountLabel(order)}
            </Text>
          </View>
          {order.status === 'AWAITING_PAYMENT' ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[typography.caption, { color: colors.warning }]}>
                Os itens estão bloqueados enquanto o pagamento é solicitado.
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: spacing.md, flexDirection: 'row' }}>
          <View style={{ flex: 1, marginRight: canRequestPayment ? spacing.sm : 0 }}>
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
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
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
          <View style={{ marginTop: spacing.md }}>
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
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Cancelar pedido"
              onPress={() => {
                void runAction(() => api.orders.cancel(order.id));
              }}
              variant="danger"
              disabled={actionBusy}
              icon="close"
              fullWidth
              testID="cancel-order-button"
            />
          </View>
        ) : null}

        <View style={{ flex: 1, marginTop: spacing.lg }}>
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
      </View>
    </Screen>
  );
}
