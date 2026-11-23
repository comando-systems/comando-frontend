import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
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
  OrderType,
  SettingsResponse,
} from '@/types';
import { occupiedOrderId, toErrorMessage } from '@/utils/errors';
import { type OrderPreview } from '@/utils/order-pricing';
import {
  createPaymentRow,
  type PaymentDraftRow,
  paymentInputsFromRows,
  validatePaymentRows,
} from '@/utils/payments';
import { permissions } from '@/utils/permissions';

const orderTypeOptions: readonly { readonly value: OrderType; readonly label: string }[] = [
  { value: 'COUNTER', label: 'Counter sale' },
  { value: 'TABLE', label: 'Export to table' },
];

function freshPaymentRows(): readonly PaymentDraftRow[] {
  return [createPaymentRow()];
}

interface SummaryCardProps {
  readonly totalCents: number;
}

const SummaryCard = memo(function SummaryCard({ totalCents }: SummaryCardProps) {
  return (
    <Card testID="counter-summary" style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.label, { color: colors.textMuted }]}>Current total</Text>
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
  const [orderType, setOrderType] = useState<OrderType>('COUNTER');
  const [tableCode, setTableCode] = useState('');
  const [paymentRows, setPaymentRows] = useState<readonly PaymentDraftRow[]>(freshPaymentRows);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseCounter = permissions.canUseCounter(user);
  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);

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
      return 'Add at least one item before continuing.';
    }

    const unavailable = draft.items.some((line) => {
      const item = catalogById.get(line.itemId);
      return item === undefined || item.enabled !== true || item.isActive !== true;
    });

    return unavailable ? 'Some items are no longer available. Refresh the catalog and try again.' : null;
  }, [catalogById, draft.items]);

  async function handleFinishSale() {
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

      setDraft(EMPTY_ORDER_DRAFT);
      setPreview(null);
      setLabel('');
      setPaymentRows(freshPaymentRows());
      router.push(`/orders/${order.id}`);
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function handleExportToTable() {
    const draftError = validateDraft();

    if (draftError !== null) {
      setError(draftError);
      return;
    }

    const normalizedCode = tableCode.trim();

    if (normalizedCode.length === 0) {
      setError('Enter a table code.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const page = await api.orders.list({
        tableCode: normalizedCode,
        status: 'OPEN',
        type: 'TABLE',
        pageSize: 1,
      });
      const existingOrder = page.data[0];

      let orderId: string;

      if (existingOrder !== undefined) {
        orderId = existingOrder.id;
      } else {
        try {
          const openedOrder = await api.orders.openTable({ tableCode: normalizedCode });
          orderId = openedOrder.id;
        } catch (openError) {
          const occupiedOrderIdFromError = occupiedOrderId(openError);

          if (occupiedOrderIdFromError !== null) {
            setDraft(EMPTY_ORDER_DRAFT);
            setTableCode('');
            router.push(`/orders/${occupiedOrderIdFromError}`);
            return;
          }

          throw openError;
        }
      }

      const updatedOrder = await api.orders.addItems(orderId, { items: draft.items });

      setDraft(EMPTY_ORDER_DRAFT);
      setTableCode('');
      router.push(`/orders/${updatedOrder.id}`);
    } catch (exportError) {
      setError(toErrorMessage(exportError));
    } finally {
      setBusy(false);
    }
  }

  if (!canUseCounter) {
    return (
      <Screen title="Counter">
        <EmptyState
          title="Not available"
          description="Counter sales are not available for your role."
          icon="counter"
        />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen title="Counter" subtitle="Closed, paid sales">
        <LoadingState message="Loading counter..." testID="counter-loading" />
      </Screen>
    );
  }

  const totalCents = preview?.totalCents ?? 0;

  return (
    <Screen scroll title="Counter" subtitle="Closed, paid sales">
      <Form
        testID="counter-form"
        submit={orderType === 'COUNTER' ? 'Finish sale' : 'Export to table'}
        onSubmit={() => {
          if (orderType === 'COUNTER') {
            void handleFinishSale();
          } else {
            void handleExportToTable();
          }
        }}
        submitButtonProps={{
          loading: busy,
          icon: orderType === 'COUNTER' ? 'check' : 'table',
          testID: orderType === 'COUNTER' ? 'counter-finish-button' : 'counter-export-button',
        }}
        style={{ paddingBottom: spacing.xl }}
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
            label="Label or customer name"
            value={label}
            onChangeText={setLabel}
            placeholder="Optional"
            maxLength={160}
            editable={!busy}
            testID="counter-label-input"
          />
          <View style={{ marginTop: spacing.md }}>
            <Segment
              label="Order type"
              value={orderType}
              onChange={setOrderType}
              options={orderTypeOptions}
              testID="counter-type"
            />
          </View>
          {orderType === 'TABLE' ? (
            <View style={{ marginTop: spacing.md }}>
              <Field
                label="Destination table"
                value={tableCode}
                onChangeText={setTableCode}
                placeholder="Enter the table code"
                autoCapitalize="characters"
                editable={!busy}
                testID="counter-table-code-input"
              />
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: spacing.md }}>
          <SummaryCard totalCents={totalCents} />
        </View>

        <View style={{ marginTop: spacing.md, flex: 1 }}>
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

        {orderType === 'COUNTER' ? (
          <View style={{ marginTop: spacing.lg }}>
            <PaymentEditor
              rows={paymentRows}
              onRowsChange={setPaymentRows}
              totalCents={totalCents}
              disabled={busy}
            />
          </View>
        ) : null}
      </Form>
    </Screen>
  );
}
