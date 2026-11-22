import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { OrderResponse } from '@/types';
import { occupiedOrderId, toErrorMessage } from '@/utils/errors';
import { orderItemCountLabel } from '@/utils/order-display';
import { permissions } from '@/utils/permissions';

interface OrderRowProps {
  readonly order: OrderResponse;
  readonly onPress: (orderId: string) => void;
}

const OrderRow = memo(function OrderRow({ order, onPress }: OrderRowProps) {
  return (
    <Card
      testID={`table-order-${order.id}`}
      onPress={() => onPress(order.id)}
      style={{ marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <OrderStatusBadge
          status={order.status}
          testID={`table-order-status-${order.id}`}
        />
        <MoneyText cents={order.totalCents} size="md" testID={`table-order-total-${order.id}`} />
      </View>
      <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="table" size="sm" color={colors.primaryDark} />
        <View style={{ marginLeft: spacing.sm, flex: 1 }}>
          <Text style={[typography.subtitle, { color: colors.text }]}>
            {order.tableCode ?? `Order ${order.id}`}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
            {orderItemCountLabel(order)}
          </Text>
        </View>
      </View>
    </Card>
  );
});

export default function Tables() {
  const { user } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<readonly OrderResponse[]>([]);
  const [tableCode, setTableCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOpenTable = permissions.canOpenTables(user);

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const page = await api.orders.list({
        statuses: ['OPEN', 'AWAITING_PAYMENT'],
        type: 'TABLE',
        pageSize: 100,
      });
      setOrders(page.data);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  const openOrder = useCallback(
    (orderId: string) => {
      router.push(`/orders/${orderId}`);
    },
    [router],
  );

  async function handleOpenTable() {
    const normalizedCode = tableCode.trim();

    if (normalizedCode.length === 0) {
      setError('Enter a table code.');
      return;
    }

    setOpening(true);
    setError(null);

    try {
      const order = await api.orders.openTable({ tableCode: normalizedCode });
      setTableCode('');
      router.push(`/orders/${order.id}`);
    } catch (openError) {
      const existingOrderId = occupiedOrderId(openError);

      if (existingOrderId !== null) {
        setTableCode('');
        router.push(`/orders/${existingOrderId}`);
        return;
      }

      setError(toErrorMessage(openError));
    } finally {
      setOpening(false);
    }
  }

  const listHeader = (
    <View>
      {canOpenTable ? (
        <View style={{ marginBottom: spacing.xl }}>
          <Field
            label="Table code"
            testID="table-code-input"
            value={tableCode}
            onChangeText={setTableCode}
            placeholder="Enter the table code"
            autoCapitalize="characters"
            editable={!opening}
          />
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Open table"
              onPress={() => {
                void handleOpenTable();
              }}
              icon="table"
              loading={opening}
              fullWidth
              testID="open-table-button"
            />
          </View>
        </View>
      ) : null}

      {error === null ? null : (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorBanner
            message={error}
            onRetry={() => {
              void loadOrders(true);
            }}
            testID="tables-error"
          />
        </View>
      )}

      {orders.length === 0 ? null : (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={[typography.label, { color: colors.text }]}>Open tables</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <Screen title="Tables" subtitle="Live table orders">
        <LoadingState message="Loading tables..." testID="tables-loading" />
      </Screen>
    );
  }

  return (
    <Screen title="Tables" subtitle="Live table orders">
      <FlatList
        testID="tables-list"
        data={orders}
        keyExtractor={(order) => order.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            title="No open tables"
            description="Table orders will appear here."
            icon="table"
          />
        }
        renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} />}
      />
    </Screen>
  );
}
