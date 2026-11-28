import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { LoadingState } from '@/components/loading-state';
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
import { orderTableLabel } from '@/utils/order-display';
import { type OrderPreview } from '@/utils/order-pricing';
import {
  type PaymentDraftRow,
  paymentInputsFromRows,
  validateClosableTotal,
  validatePaymentRows,
} from '@/utils/payments';
import { permissions } from '@/utils/permissions';
import { nextTableCode } from '@/utils/table-codes';

const NEW_TABLE = 'NEW';

const styles = StyleSheet.create({
  errorSection: {
    marginBottom: spacing.lg,
  },
  spacingMd: {
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  labelText: {
    color: colors.text,
    ...typography.label,
  },
  captionMutedSpaced: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    ...typography.caption,
  },
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
        label: orderTableLabel(order) ?? order.label ?? `Mesa ${order.id}`,
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

    const totalError = validateClosableTotal(preview?.totalCents ?? 0);

    if (totalError !== null) {
      setError(totalError);
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
        const openedOrder = await api.orders.openTable({ tableCode: suggestedTableCode });
        targetOrderId = openedOrder.id;
      }

      try {
        const updatedOrder = await api.orders.addItems(targetOrderId, { items: draft.items });

        resetCounter();
        router.push(`/orders/${updatedOrder.id}`);
      } catch (addError) {
        // Adding lines is when a named table becomes occupied. Follow the existing order.
        const existingOrderId = occupiedOrderId(addError);

        if (existingOrderId !== null) {
          resetCounter();
          router.push(`/orders/${existingOrderId}`);
          return;
        }

        throw addError;
      }
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
    <Screen scroll title="Balcão" subtitle="Vendas fechadas e pagas">
      {error === null ? null : (
        <View style={styles.errorSection}>
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

      <View style={styles.spacingMd}>
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

      <View style={styles.actionRow}>
        <View style={styles.flexOne}>
          <Button
            label="Finalizar"
            onPress={handleFinish}
            disabled={busy}
            icon="check"
            testID="counter-finish-button"
          />
        </View>
        <View style={styles.flexOne}>
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

      {showExport ? (
        <Card testID="counter-export-panel" style={styles.spacingMd}>
          <Text style={styles.labelText}>Mesa de destino</Text>
          <Text style={styles.captionMutedSpaced}>
            {`Escolha uma mesa ou abra ${suggestedTableCode}.`}
          </Text>
          <View style={styles.spacingMd}>
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
        <View testID="counter-payment-panel" style={styles.spacingMd}>
          <PaymentEditor
            rows={paymentRows}
            onRowsChange={setPaymentRows}
            totalCents={totalCents}
            disabled={busy}
          />
          <View style={styles.spacingMd}>
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
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
