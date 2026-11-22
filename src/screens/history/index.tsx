import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { OrderStatusBadge } from '@/components/order-status-badge';
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
import { orderItemCountLabel } from '@/utils/order-display';
import { permissions } from '@/utils/permissions';

const PAGE_SIZE = 20;

const statusOptions: readonly SegmentOption<HistoryStatusFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'AWAITING_PAYMENT', label: 'Awaiting' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELED', label: 'Canceled' },
];

const typeOptions: readonly SegmentOption<HistoryTypeFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'COUNTER', label: 'Counter' },
  { value: 'TABLE', label: 'Table' },
];

interface OrderRowProps {
  readonly order: OrderResponse;
  readonly onPress: (orderId: string) => void;
}

const OrderRow = memo(function OrderRow({ order, onPress }: OrderRowProps) {
  const title = order.tableCode ?? order.label ?? `Order ${order.id}`;
  const channel = order.type === 'TABLE' ? 'Table' : 'Counter';

  return (
    <Card
      testID={`history-order-${order.id}`}
      onPress={() => onPress(order.id)}
      style={{ marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <OrderStatusBadge status={order.status} testID={`history-status-badge-${order.id}`} />
        <MoneyText
          cents={order.totalCents}
          size="md"
          testID={`history-total-${order.id}`}
        />
      </View>
      <Text
        style={[typography.subtitle, { color: colors.text, marginTop: spacing.md }]}
        testID={`history-title-${order.id}`}
      >
        {title}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {`${channel} · ${orderItemCountLabel(order)}`}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {`Created ${order.createdAt.slice(0, 10)} UTC`}
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
      <Screen title="History">
        <EmptyState
          title="Not available"
          description="Order history is not available for your role."
          icon="lock"
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen title="History" subtitle="Closed, canceled, and live orders">
        <LoadingState message="Loading order history..." testID="history-loading" />
      </Screen>
    );
  }

  const listHeader = (
    <View>
      <Card testID="history-filters">
        <Text style={[typography.subtitle, { color: colors.text }]}>Filters</Text>
        <View style={{ marginTop: spacing.md }}>
          <Segment
            label="Status filter"
            value={filters.status}
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
            options={statusOptions}
            testID="history-status"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Segment
            label="Type filter"
            value={filters.type}
            onChange={(type) => setFilters((current) => ({ ...current, type }))}
            options={typeOptions}
            testID="history-type"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Table code"
            value={filters.tableCode}
            onChangeText={(tableCode) => setFilters((current) => ({ ...current, tableCode }))}
            placeholder="Any table"
            maxLength={64}
            autoCapitalize="characters"
            editable={!refreshing}
            testID="history-table-code"
          />
        </View>
        <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Field
              label="From date (UTC)"
              value={filters.fromDate}
              onChangeText={(fromDate) => setFilters((current) => ({ ...current, fromDate }))}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              editable={!refreshing}
              testID="history-from"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="To date (UTC)"
              value={filters.toDate}
              onChangeText={(toDate) => setFilters((current) => ({ ...current, toDate }))}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              editable={!refreshing}
              testID="history-to"
            />
          </View>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="Apply filters"
            onPress={applyFilters}
            icon="search"
            fullWidth
            testID="history-apply"
          />
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Button
            label="Clear filters"
            onPress={clearFilters}
            variant="secondary"
            fullWidth
            testID="history-clear"
          />
        </View>
      </Card>

      <Card testID="history-summary" style={{ marginTop: spacing.md }}>
        <Text
          style={[typography.label, { color: colors.text }]}
          testID="history-result-count"
        >
          {`Showing ${pagination.total} ${pagination.total === 1 ? 'order' : 'orders'}`}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: spacing.md,
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Closed on this page
          </Text>
          <Text style={[typography.label, { color: colors.text }]} testID="history-closed-count">
            {closedOnPage.length}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.sm,
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Revenue on this page
          </Text>
          <MoneyText
            cents={revenueOnPageCents}
            size="sm"
            testID="history-page-revenue"
          />
        </View>
      </Card>

      {error === null ? null : (
        <View style={{ marginTop: spacing.md }}>
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
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.label, { color: colors.text }]}>Orders</Text>
        </View>
      )}
    </View>
  );

  const listFooter = (
    <Card testID="history-pagination" style={{ marginTop: spacing.md }}>
      <Text style={[typography.label, { color: colors.text }]} testID="history-page-label">
        {`Page ${page} of ${totalPages}`}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Button
            label="Previous"
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            variant="secondary"
            disabled={page <= 1}
            testID="history-previous"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Next"
            onPress={() => setPage((current) => current + 1)}
            variant="secondary"
            disabled={page >= totalPages}
            testID="history-next"
          />
        </View>
      </View>
    </Card>
  );

  return (
    <Screen title="History" subtitle="Closed, canceled, and live orders">
      <FlatList
        testID="history-list"
        data={orders}
        keyExtractor={(order) => order.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <EmptyState
            title="No orders found"
            description="Try changing the filters or date range."
            icon="history"
          />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} />
        }
        renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
      />
    </Screen>
  );
}
