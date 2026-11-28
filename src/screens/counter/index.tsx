import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { EMPTY_ORDER_DRAFT, OrderBuilder } from '@/components/order-builder';
import { PaymentEditor } from '@/components/payment-editor';
import { Screen } from '@/components/screen';
import { Segment } from '@/components/segment';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type {
  CreateCounterOrderRequest,
  ItemResponse,
  OrderDraft,
  OrderResponse,
  SettingsResponse,
} from '@/types';
import { occupiedOrderId, toErrorMessage } from '@/utils/errors';
import { type OrderPreview } from '@/utils/order-pricing';
import {
  type PaymentDraftRow,
  paymentInputsFromRows,
  validatePaymentRows,
} from '@/utils/payments';
import { permissions } from '@/utils/permissions';
import { nextTableCode } from '@/utils/table-codes';

const NEW_TABLE = 'NEW';

interface SummaryCardProps {
  readonly totalCents: number;
}

const SummaryCard = memo(function SummaryCard({ totalCents }: SummaryCardProps) {
  return (
    <Card testID="counter-summary" style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.label, { color: colors.textMuted }]}>Total atual</Text>
        <MoneyText cents={totalCents} size="lg" testID="counter-total" />
      </View>
    </Card>
  );
});

export default function Counter() {
  const { user } = useSession();
  const router = useRouter();
  const [catalog, setCatalog] = useState<readonly ItemResponse[]>([]);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<OrderDraft>(EMPTY_ORDER_DRAFT);
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [label, setLabel] = useState('');
  const [paymentRows, setPaymentRows] = useState<readonly PaymentDraftRow[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [tableOrders, setTableOrders] = useState<readonly OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseCounter = permissions.canUseCounter(user);
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);

  const suggestedTableCode = useMemo(
    () => nextTableCode(tableOrders.map((order) => order.tableCode)),
    [tableOrders],
  );

  const exportOptions = useMemo(
    () => [
      ...tableOrders.map((order) => ({
        value: order.id,
        label: order.tableCode ?? order.label ?? `Mesa ${order.id}`,
        disabled: busy,
      })),
      { value: NEW_TABLE, label: 'Nova mesa', disabled: busy },
    ],
    [busy, tableOrders],
  );

  const loadData = useCallback(async () => {
    if (!canUseCounter) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [itemPage, loadedSettings] = await Promise.all([
        api.items.list({ pageSize: 100 }),
        api.settings.get(),
      ]);
      setCatalog(itemPage.data);
      setSettings(loadedSettings);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [canUseCounter]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const validateDraft = useCallback((): string | null => {
    if (draft.items.length === 0) {
      return 'Adicione pelo menos um item para continuar.';
    }

    const unavailable = draft.items.some((line) => {
      const item = catalogById.get(line.itemId);
      return item === undefined || item.enabled !== true || item.isActive !== true;
    });

    return unavailable
      ? 'Alguns produtos não estão mais disponíveis. Atualize o catálogo e tente novamente.'
      : null;
  }, [catalogById, draft.items]);

  const resetCounter = useCallback(() => {
    setDraft(EMPTY_ORDER_DRAFT);
    setPreview(null);
    setLabel('');
    setPaymentRows([]);
    setShowPayment(false);
    setShowExport(false);
    setTableOrders([]);
  }, []);

  function handleFinish() {
    const draftError = validateDraft();

    if (draftError !== null) {
      setError(draftError);
      return;
    }

    setError(null);
    setShowExport(false);
    setShowPayment(true);
  }

  async function handleConfirmSale() {
    const draftError = validateDraft();

    if (draftError !== null) {
      setError(draftError);
      return;
    }

    const totalCents = preview?.totalCents ?? 0;
    const paymentError = validatePaymentRows(paymentRows, totalCents);

    if (paymentError !== null) {
      setError(paymentError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const body: CreateCounterOrderRequest = {
        items: draft.items,
        payments: paymentInputsFromRows(paymentRows),
        label: label.trim().length === 0 ? null : label.trim(),
        surchargeCents: draft.surchargeCents,
        discountCents: draft.discountCents,
        applyServiceFee: draft.applyServiceFee,
      };
      const order = await api.orders.createCounter(body);

      resetCounter();
      router.push(`/orders/${order.id}`);
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenExport() {
    const draftError = validateDraft();

    if (draftError !== null) {
      setError(draftError);
      return;
    }

    setError(null);
    setShowPayment(false);
    setShowExport(true);
    setTableOrders([]);
    setBusy(true);

    try {
      const page = await api.orders.list({
        statuses: ['OPEN', 'AWAITING_PAYMENT'],
        type: 'TABLE',
        pageSize: 100,
      });
      setTableOrders(page.data);
    } catch (loadError) {
      setShowExport(false);
      setError(toErrorMessage(loadError));
    } finally {
      setBusy(false);
    }
  }

  async function handleExportTo(orderId: string) {
    const draftError = validateDraft();

    if (draftError !== null) {
      setError(draftError);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      let targetOrderId = orderId;

      if (orderId === NEW_TABLE) {
        try {
          const openedOrder = await api.orders.openTable({ tableCode: suggestedTableCode });
          targetOrderId = openedOrder.id;
        } catch (openError) {
          const existingOrderId = occupiedOrderId(openError);

          if (existingOrderId !== null) {
            resetCounter();
            router.push(`/orders/${existingOrderId}`);
            return;
          }

          throw openError;
        }
      }

      const updatedOrder = await api.orders.addItems(targetOrderId, { items: draft.items });

      resetCounter();
      router.push(`/orders/${updatedOrder.id}`);
    } catch (exportError) {
      setError(toErrorMessage(exportError));
    } finally {
      setBusy(false);
    }
  }

  if (!canUseCounter) {
    return (
      <Screen title="Balcão">
        <EmptyState
          title="Indisponível"
          description="Vendas no balcão não estão disponíveis para sua função."
          icon="counter"
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen title="Balcão" subtitle="Vendas fechadas e pagas">
        <LoadingState message="Carregando balcão..." testID="counter-loading" />
      </Screen>
    );
  }

  const totalCents = preview?.totalCents ?? 0;

  return (
    <Screen title="Balcão" subtitle="Vendas fechadas e pagas">
      <View style={{ flex: 1 }}>
        {/*
         * Keep the builder's FlatList outside of a ScrollView so React Native does not
         * warn about nested virtualized lists. The header, panels and actions scroll
         * independently and stay reachable on small screens.
         */}
        <ScrollView
          style={{ flexGrow: 0, maxHeight: 360 }}
          contentContainerStyle={{ paddingBottom: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          {error === null ? null : (
            <View style={{ marginBottom: spacing.lg }}>
              <ErrorBanner
                message={error}
                onRetry={() => {
                  void loadData();
                }}
                testID="counter-error"
              />
            </View>
          )}

          <Card testID="counter-options">
            <Field
              label="Identificação ou nome do cliente"
              value={label}
              onChangeText={setLabel}
              placeholder="Opcional"
              maxLength={160}
              editable={!busy}
              testID="counter-label-input"
            />
          </Card>

          <View style={{ marginTop: spacing.md }}>
            <SummaryCard totalCents={totalCents} />
          </View>

          {showExport ? (
            <Card testID="counter-export-panel" style={{ marginTop: spacing.md }}>
              <Text style={[typography.label, { color: colors.text }]}>Mesa de destino</Text>
              <Text
                style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}
              >
                {`Escolha uma mesa ou abra ${suggestedTableCode}.`}
              </Text>
              <View style={{ marginTop: spacing.md }}>
                <Segment
                  label="Mesa de destino"
                  value=""
                  onChange={(orderId) => {
                    void handleExportTo(orderId);
                  }}
                  options={exportOptions}
                  testID="counter-export-table"
                />
              </View>
            </Card>
          ) : null}

          {showPayment ? (
            <View testID="counter-payment-panel" style={{ marginTop: spacing.md }}>
              <PaymentEditor
                rows={paymentRows}
                onRowsChange={setPaymentRows}
                totalCents={totalCents}
                disabled={busy}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={{ flex: 1, minHeight: 180 }}>
          <OrderBuilder
            mode="draft"
            draft={draft}
            onDraftChange={setDraft}
            catalog={catalog}
            settings={settings ?? undefined}
            canEdit={!busy}
            onPreviewChange={setPreview}
          />
        </View>

        <View style={{ paddingTop: spacing.md }}>
          {showPayment ? (
            <Button
              label="Confirmar venda"
              onPress={() => {
                void handleConfirmSale();
              }}
              loading={busy}
              icon="check"
              fullWidth
              testID="counter-confirm-sale-button"
            />
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginTop: showPayment ? spacing.sm : 0,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                label="Finalizar"
                onPress={handleFinish}
                disabled={busy}
                icon="check"
                testID="counter-finish-button"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Exportar para mesa"
                onPress={() => {
                  void handleOpenExport();
                }}
                disabled={busy}
                icon="table"
                testID="counter-export-button"
              />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
