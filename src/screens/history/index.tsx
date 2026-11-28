import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Pagination } from '@/components/pagination';
import { Screen } from '@/components/screen';
import { Segment, type SegmentOption } from '@/components/segment';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { OrderResponse, PageResponse } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import {
  EMPTY_HISTORY_FILTERS,
  type HistoryFilters,
  type HistoryStatusFilter,
  type HistoryTypeFilter,
  historyListQuery,
  validateHistoryFilters,
} from '@/utils/history-filters';
import { orderItemCountLabel, orderStatusLabels } from '@/utils/order-display';
import { permissions } from '@/utils/permissions';

const PAGE_SIZE = 20;

const statusOptions: readonly SegmentOption<HistoryStatusFilter>[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OPEN', label: orderStatusLabels.OPEN },
  { value: 'AWAITING_PAYMENT', label: orderStatusLabels.AWAITING_PAYMENT },
  { value: 'CLOSED', label: orderStatusLabels.CLOSED },
  { value: 'CANCELED', label: orderStatusLabels.CANCELED },
];

const typeOptions: readonly SegmentOption<HistoryTypeFilter>[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'COUNTER', label: 'Balcão' },
  { value: 'TABLE', label: 'Mesas' },
];

const styles = StyleSheet.create({
  orderCard: {
    marginBottom: spacing.md,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.md,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  captionSpaced: {
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  blockSpacing: {
    marginTop: spacing.md,
  },
  blockSpacingLg: {
    marginTop: spacing.lg,
  },
  filterDateRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  filterColumnLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  filterColumnRight: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});

interface OrderRowProps {
  readonly order: OrderResponse;
  readonly onPress: (orderId: string) => void;
}

const OrderRow = memo(function OrderRow({ order, onPress }: OrderRowProps) {
  const title = order.tableCode ?? order.label ?? `Pedido ${order.id}`;
  const channel = order.type === 'TABLE' ? 'Mesas' : 'Balcão';

  return (
    <Card
      testID={`history-order-${order.id}`}
      onPress={() => onPress(order.id)}
      style={styles.orderCard}
    >
      <View style={styles.orderTop}>
        <OrderStatusBadge status={order.status} testID={`history-status-badge-${order.id}`} />
        <MoneyText
          cents={order.totalCents}
          size="md"
          testID={`history-total-${order.id}`}
        />
      </View>
      <Text
        style={styles.orderTitle}
        testID={`history-title-${order.id}`}
      >
        {title}
      </Text>
      <Text style={[styles.caption, styles.captionSpaced]}>
        {`${channel} · ${orderItemCountLabel(order)}`}
      </Text>
      <Text style={[styles.caption, styles.captionSpaced]}>
        {`Criado em ${order.createdAt.slice(0, 10)} UTC`}
      </Text>
    </Card>
  );
});

export default function History() {
  const { user } = useSession();
  const router = useRouter();
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [orders, setOrders] = useState<readonly OrderResponse[]>([]);
  const [pagination, setPagination] = useState<PageResponse<OrderResponse>['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canViewHistory = permissions.canViewHistory(user);

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!canViewHistory) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const validationError = validateHistoryFilters(appliedFilters);

      if (validationError !== null) {
        setError(validationError);
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await api.orders.list(historyListQuery(appliedFilters, page, PAGE_SIZE));
        setOrders(result.data);
        setPagination(result.pagination);
      } catch (loadError) {
        setError(toErrorMessage(loadError));
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [appliedFilters, canViewHistory, page],
  );

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

  const applyFilters = useCallback(() => {
    const validationError = validateHistoryFilters(filters);

    if (validationError !== null) {
      setError(validationError);
      return;
    }

    setAppliedFilters(filters);
    setPage(1);
    setError(null);
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_HISTORY_FILTERS);
    setAppliedFilters(EMPTY_HISTORY_FILTERS);
    setPage(1);
    setError(null);
  }, []);

  const totalPages = Math.max(pagination.totalPages, 1);
  const closedOnPage = orders.filter((order) => order.status === 'CLOSED');
  const revenueOnPageCents = closedOnPage.reduce((sum, order) => sum + order.totalCents, 0);

  if (!canViewHistory) {
    return (
      <Screen title="Histórico">
        <EmptyState
          title="Indisponível"
          description="O histórico de pedidos não está disponível para seu perfil."
          icon="lock"
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen title="Histórico" subtitle="Pedidos fechados, cancelados e em andamento">
        <LoadingState message="Carregando histórico de pedidos..." testID="history-loading" />
      </Screen>
    );
  }

  const listHeader = (
    <View>
      <Form
        testID="history-filters"
        submit="Aplicar filtros"
        onSubmit={applyFilters}
        cancel="Limpar filtros"
        onCancel={clearFilters}
        submitButtonProps={{ icon: 'search', testID: 'history-apply' }}
        cancelButtonProps={{ testID: 'history-clear' }}
      >
        <Text style={styles.subtitle}>Filtros</Text>
        <View style={styles.blockSpacing}>
          <Segment
            label="Filtro de status"
            value={filters.status}
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
            options={statusOptions}
            testID="history-status"
          />
        </View>
        <View style={styles.blockSpacing}>
          <Segment
            label="Filtro de tipo"
            value={filters.type}
            onChange={(type) => setFilters((current) => ({ ...current, type }))}
            options={typeOptions}
            testID="history-type"
          />
        </View>
        <View style={styles.blockSpacing}>
          <Field
            label="Código da mesa"
            value={filters.tableCode}
            onChangeText={(tableCode) => setFilters((current) => ({ ...current, tableCode }))}
            placeholder="Qualquer mesa"
            maxLength={64}
            autoCapitalize="characters"
            editable={!refreshing}
            testID="history-table-code"
          />
        </View>
        <View style={styles.filterDateRow}>
          <View style={styles.filterColumnLeft}>
            <Field
              label="Data inicial (UTC)"
              value={filters.fromDate}
              onChangeText={(fromDate) => setFilters((current) => ({ ...current, fromDate }))}
              placeholder="AAAA-MM-DD"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              editable={!refreshing}
              testID="history-from"
            />
          </View>
          <View style={styles.filterColumnRight}>
            <Field
              label="Data final (UTC)"
              value={filters.toDate}
              onChangeText={(toDate) => setFilters((current) => ({ ...current, toDate }))}
              placeholder="AAAA-MM-DD"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              editable={!refreshing}
              testID="history-to"
            />
          </View>
        </View>
      </Form>

      <Card testID="history-summary" style={styles.blockSpacing}>
        <Text
          style={styles.label}
          testID="history-result-count"
        >
          {`Exibindo ${pagination.total} ${pagination.total === 1 ? 'pedido' : 'pedidos'}`}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.caption}>
            Fechados nesta página
          </Text>
          <Text style={styles.label} testID="history-closed-count">
            {closedOnPage.length}
          </Text>
        </View>
        <View style={styles.revenueRow}>
          <Text style={styles.caption}>
            Faturamento nesta página
          </Text>
          <MoneyText
            cents={revenueOnPageCents}
            size="sm"
            testID="history-page-revenue"
          />
        </View>
      </Card>

      {error === null ? null : (
        <View style={styles.blockSpacing}>
          <ErrorBanner
            message={error}
            onRetry={() => {
              void loadOrders(true);
            }}
            testID="history-error"
          />
        </View>
      )}

      {orders.length === 0 ? null : (
        <View style={styles.blockSpacingLg}>
          <Text style={styles.label}>Pedidos</Text>
        </View>
      )}
    </View>
  );

  const listFooter = (
    <Card testID="history-pagination" style={styles.blockSpacing}>
      <Text style={styles.label} testID="history-page-label">
        {`Página ${page} de ${totalPages}`}
      </Text>
      <View style={styles.blockSpacing}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          testID="history-pages"
        />
      </View>
    </Card>
  );

  return (
    <Screen title="Histórico" subtitle="Pedidos fechados, cancelados e em andamento">
      <FlatList
        testID="history-list"
        data={orders}
        keyExtractor={(order) => order.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Tente alterar os filtros ou o período."
            icon="history"
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} />
        }
        renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
      />
    </Screen>
  );
}
