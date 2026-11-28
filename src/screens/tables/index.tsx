import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
import { colors, radii, spacing, typography } from '@/theme';
import type { OrderResponse } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { orderItemCountLabel, orderStatusLabels, orderTableLabel } from '@/utils/order-display';
import { permissions } from '@/utils/permissions';
import { nextTableCode, resolveTableCode } from '@/utils/table-codes';

interface OrderRowProps {
  readonly order: OrderResponse;
  readonly onPress: (orderId: string) => void;
}

const styles = StyleSheet.create({
  summaryPill: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryText: {
    color: colors.primaryDark,
    ...typography.label,
  },
  toolbar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  search: {
    maxWidth: 380,
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.lg,
    justifyContent: 'flex-end',
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  legendText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  tableCard: {
    flex: 1,
    marginBottom: spacing.md,
  },
  tableCardOpen: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tableCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  tableIconOpen: {
    backgroundColor: colors.surface,
  },
  tableName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  tableAmount: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  tableHint: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    ...typography.caption,
  },
  tableHintAction: {
    color: colors.primaryDark,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    color: colors.text,
    marginBottom: spacing.md,
    ...typography.label,
  },
  legendDotSuccess: {
    backgroundColor: colors.success,
  },
  legendDotAwaiting: {
    backgroundColor: colors.primary,
  },
  renameSection: {
    marginBottom: spacing.xl,
  },
  errorSection: {
    marginBottom: spacing.lg,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});

const OrderRow = memo(function OrderRow({ order, onPress }: OrderRowProps) {
  const isOpen = order.status === 'OPEN';

  return (
    <Card
      testID={`table-order-${order.id}`}
      onPress={() => onPress(order.id)}
      style={[styles.tableCard, isOpen ? styles.tableCardOpen : null]}
    >
      <View style={styles.tableCardTop}>
        <View style={[styles.tableIcon, isOpen ? styles.tableIconOpen : null]}>
          <Icon name="table" size="sm" color={isOpen ? colors.primaryDark : colors.textMuted} />
        </View>
        <OrderStatusBadge status={order.status} testID={`table-order-status-${order.id}`} />
      </View>
      <Text style={styles.tableName}>{orderTableLabel(order) ?? `Pedido ${order.id}`}</Text>
      <MoneyText
        cents={order.totalCents}
        size="md"
        color={colors.primaryDark}
        testID={`table-order-total-${order.id}`}
      />
      <Text style={styles.tableHint}>{orderItemCountLabel(order)}</Text>
      <Text style={[styles.tableHint, styles.tableHintAction]}>Toque para abrir o pedido</Text>
    </Card>
  );
});

export default function Tables() {
  const { user } = useSession();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [orders, setOrders] = useState<readonly OrderResponse[]>([]);
  const [query, setQuery] = useState('');
  const [customTableCode, setCustomTableCode] = useState('');
  const [renamingTable, setRenamingTable] = useState(false);
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

  const suggestedCode = useMemo(
    () => nextTableCode(orders.map((order) => order.tableCode)),
    [orders],
  );

  async function handleOpenTable() {
    const tableCode = resolveTableCode(suggestedCode, customTableCode);

    setOpening(true);
    setError(null);

    try {
      const order = await api.orders.openTable({ tableCode });
      setCustomTableCode('');
      setRenamingTable(false);
      router.push(`/orders/${order.id}`);
    } catch (openError) {
      setError(toErrorMessage(openError));
    } finally {
      setOpening(false);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOrders = useMemo(
    () =>
      normalizedQuery.length === 0
        ? orders
        : orders.filter((order) =>
            (orderTableLabel(order) ?? `Pedido ${order.id}`).toLowerCase().includes(normalizedQuery),
          ),
    [normalizedQuery, orders],
  );
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  const listHeader = (
    <View>
      <View style={styles.toolbar}>
        <Field
          label="Buscar mesas"
          testID="table-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar pelo código da mesa"
          icon="search"
          autoCorrect={false}
          editable={!opening}
          containerStyle={styles.search}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotSuccess]} />
            <Text style={styles.legendText}>{orderStatusLabels.OPEN}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotAwaiting]} />
            <Text style={styles.legendText}>{orderStatusLabels.AWAITING_PAYMENT}</Text>
          </View>
        </View>
        {canOpenTable ? (
          <Button
            label="Abrir mesa"
            onPress={() => {
              void handleOpenTable();
            }}
            icon="table"
            loading={opening}
            variant="secondary"
            testID="open-table-button"
          />
        ) : null}
      </View>

      {canOpenTable ? (
        <View style={styles.renameSection}>
          <Button
            label={renamingTable ? 'Usar nome sugerido' : 'Renomear mesa'}
            onPress={() => {
              setCustomTableCode('');
              setRenamingTable((current) => !current);
            }}
            variant="tertiary"
            disabled={opening}
            testID="table-rename-toggle"
          />
          {renamingTable ? (
            <Field
              label="Nome da mesa"
              testID="table-code-input"
              value={customTableCode}
              onChangeText={setCustomTableCode}
              placeholder={suggestedCode}
              maxLength={64}
              autoCorrect={false}
              editable={!opening}
              helper={`Sugerido: ${suggestedCode}. Deixe em branco para usar.`}
            />
          ) : null}
        </View>
      ) : null}

      {error === null ? null : (
        <View style={styles.errorSection}>
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
        <Text style={styles.sectionLabel}>Mesas abertas</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <Screen title="Mesas" subtitle="Acompanhe as operações abertas e inicie novos pedidos.">
        <LoadingState message="Carregando mesas..." testID="tables-loading" />
      </Screen>
    );
  }

  return (
    <Screen
      title="Mesas"
      subtitle="Acompanhe as operações abertas e inicie novos pedidos."
      action={
        <View style={styles.summaryPill}>
          <Icon name="table" size="sm" color={colors.primaryDark} />
          <Text style={styles.summaryText}>
            {`${orders.length} ${orders.length === 1 ? 'mesa' : 'mesas'} em atendimento`}
          </Text>
        </View>
      }
    >
      <FlatList
        testID="tables-list"
        data={visibleOrders}
        keyExtractor={(order) => order.id}
        numColumns={columns}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            title={normalizedQuery.length === 0 ? 'Nenhuma mesa aberta' : 'Nenhuma mesa encontrada'}
            description={
              normalizedQuery.length === 0
                ? 'Os pedidos das mesas aparecerão aqui.'
                : 'Nenhuma mesa aberta corresponde à sua busca.'
            }
            icon="table"
          />
        }
        renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} />}
      />
    </Screen>
  );
}
