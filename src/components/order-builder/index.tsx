import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Segment } from '@/components/segment';
import { api, ApiError, getErrorMessage } from '@/services/api';
import { colors, radii, spacing, typography } from '@/theme';
import type {
  ItemResponse,
  OrderDraft,
  OrderDraftLine,
  OrderResponse,
  SettingsResponse,
} from '@/types';
import { formatCategories } from '@/utils/categories';
import {
  buildOrderPreview,
  clampDiscountCents,
  parseCentsInput,
  type OrderPreview,
  type OrderPreviewLine,
  type OrderPreviewLineResult,
} from '@/utils/order-pricing';

interface OrderBuilderBaseProps {
  readonly catalog: readonly ItemResponse[];
  readonly settings?: SettingsResponse;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
  readonly canEdit?: boolean;
  readonly onPreviewChange?: (preview: OrderPreview) => void;
}

export type OrderBuilderProps = OrderBuilderBaseProps &
  (
    | {
        readonly mode: 'draft';
        readonly draft: OrderDraft;
        readonly onDraftChange: (draft: OrderDraft) => void;
      }
    | {
        readonly mode: 'order';
        readonly order: OrderResponse;
        readonly onOrderChange: (order: OrderResponse) => void;
      }
  );

export const EMPTY_ORDER_DRAFT: OrderDraft = {
  items: [],
  surchargeCents: 0,
  discountCents: 0,
  applyServiceFee: false,
};

type FeeChoice = 'on' | 'off';

interface PricingFields {
  readonly surcharge: string;
  readonly discount: string;
  readonly fee: FeeChoice;
}

interface PendingPricing {
  readonly key: string;
  readonly fields: PricingFields;
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  catalogRow: {
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    color: colors.text,
    ...typography.label,
  },
  itemMeta: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    ...typography.caption,
  },
  lineTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  lineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  lockedQuantity: {
    color: colors.text,
    minWidth: 48,
    textAlign: 'center',
    ...typography.subtitle,
  },
  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    color: colors.textMuted,
    ...typography.body,
  },
  summaryTotalLabel: {
    color: colors.text,
    ...typography.subtitle,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  pricingActions: {
    marginTop: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  caption: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    ...typography.caption,
  },
  error: {
    marginBottom: spacing.md,
  },
  busy: {
    marginLeft: spacing.sm,
  },
});

function normalizeQuantity(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

function isSellable(item: ItemResponse | undefined): boolean {
  return item?.enabled === true && item.isActive === true;
}

function toPricingFields(
  surchargeCents: number,
  discountCents: number,
  applyServiceFee: boolean,
): PricingFields {
  return {
    surcharge: String(surchargeCents),
    discount: String(discountCents),
    fee: applyServiceFee ? 'on' : 'off',
  };
}

function toPricingKey(
  surchargeCents: number,
  discountCents: number,
  applyServiceFee: boolean,
): string {
  return `${surchargeCents}|${discountCents}|${applyServiceFee ? 'on' : 'off'}`;
}

interface CatalogRowProps {
  readonly item: ItemResponse;
  readonly quantity: number;
  readonly disabled: boolean;
  readonly onAdd: (itemId: string) => void;
  readonly onQuantityChange: (itemId: string, quantity: number) => void;
}

const CatalogRow = memo(function CatalogRow({
  item,
  quantity,
  disabled,
  onAdd,
  onQuantityChange,
}: CatalogRowProps) {
  return (
    <Card testID={`catalog-item-${item.id}`} style={styles.catalogRow}>
      <View style={styles.itemRow}>
        {item.imageUrl === null ? (
          <View
            testID={`catalog-image-${item.id}`}
            style={[styles.itemImage, styles.itemImagePlaceholder]}
          >
            <Icon name="food" size="md" color={colors.primary} />
          </View>
        ) : (
          <Image
            testID={`catalog-image-${item.id}`}
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
          />
        )}
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {formatCategories(item.categories, item.category)}
          </Text>
          <MoneyText cents={item.priceCents} size="sm" color={colors.primaryDark} />
        </View>
        {!isSellable(item) ? <Badge label="Não é possível pedir" tone="danger" /> : null}
      </View>
      <View style={styles.lineActions}>
        {disabled || !isSellable(item) ? (
          <Badge label={quantity > 0 ? 'No pedido' : 'Indisponível'} tone="neutral" />
        ) : quantity === 0 ? (
          <Button
            label="Adicionar"
            onPress={() => onAdd(item.id)}
            fullWidth
            testID={`add-item-${item.id}`}
          />
        ) : (
          <QuantityStepper
            value={quantity}
            onChange={(nextQuantity) => onQuantityChange(item.id, nextQuantity)}
            label={item.name}
            testID={`catalog-stepper-${item.id}`}
          />
        )}
      </View>
    </Card>
  );
});

interface BuilderLineProps {
  readonly line: OrderPreviewLineResult;
  readonly canEditQuantity: boolean;
  readonly canRemove: boolean;
  readonly onQuantityChange: (itemId: string, quantity: number) => void;
  readonly onRemove: (itemId: string) => void;
}

const BuilderLine = memo(function BuilderLine({
  line,
  canEditQuantity,
  canRemove,
  onQuantityChange,
  onRemove,
}: BuilderLineProps) {
  return (
    <Card testID={`builder-line-${line.itemId}`} style={styles.card}>
      <View style={styles.lineTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{line.itemName}</Text>
          <Text style={styles.itemMeta}>
            {`${line.quantity} x `}
            <MoneyText cents={line.unitPriceCents} size="sm" color={colors.textMuted} />
          </Text>
        </View>
        <MoneyText cents={line.lineTotalCents} size="sm" testID={`line-total-${line.itemId}`} />
      </View>
      <View style={styles.lineActions}>
        {canEditQuantity ? (
          <QuantityStepper
            value={line.quantity}
            onChange={(nextQuantity) => onQuantityChange(line.itemId, nextQuantity)}
            label={line.itemName}
            testID={`line-stepper-${line.itemId}`}
          />
        ) : (
          <Text testID={`line-quantity-${line.itemId}`} style={styles.lockedQuantity}>
            {line.quantity}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover ${line.itemName}`}
          disabled={!canRemove}
          testID={`remove-${line.itemId}`}
          onPress={() => onRemove(line.itemId)}
          style={({ pressed }) => [
            styles.removeButton,
            { opacity: canRemove ? (pressed ? 0.7 : 1) : 0.5 },
          ]}
        >
          <Icon name="trash" size="sm" color={colors.danger} />
        </Pressable>
      </View>
    </Card>
  );
});

interface SummaryRowProps {
  readonly label: string;
  readonly cents: number;
  readonly testID: string;
  readonly total?: boolean;
}

function SummaryRow({ label, cents, testID, total = false }: SummaryRowProps) {
  return (
    <View style={[styles.summaryRow, total ? styles.totalRow : null]}>
      <Text style={total ? styles.summaryTotalLabel : styles.summaryLabel}>{label}</Text>
      <MoneyText cents={cents} size={total ? 'lg' : 'sm'} testID={testID} />
    </View>
  );
}

export function OrderBuilder(props: OrderBuilderProps) {
  const { catalog, settings, loading = false, error = null, onRetry, canEdit = true } = props;
  const [query, setQuery] = useState('');
  const [pendingPricing, setPendingPricing] = useState<PendingPricing | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const draft = props.mode === 'draft' ? props.draft : null;
  const onDraftChange = props.mode === 'draft' ? props.onDraftChange : null;
  const order = props.mode === 'order' ? props.order : null;
  const onOrderChange = props.mode === 'order' ? props.onOrderChange : null;
  const draftItems = draft?.items ?? null;
  const orderItems = order?.items ?? null;
  const orderStatus = order?.status ?? null;

  const sourceSurchargeCents = draft?.surchargeCents ?? order?.surchargeCents ?? 0;
  const sourceDiscountCents = draft?.discountCents ?? order?.discountCents ?? 0;
  const sourceApplyServiceFee = draft?.applyServiceFee ?? order?.applyServiceFee ?? false;
  const sourceKey = toPricingKey(sourceSurchargeCents, sourceDiscountCents, sourceApplyServiceFee);
  const fields =
    pendingPricing?.key === sourceKey
      ? pendingPricing.fields
      : toPricingFields(sourceSurchargeCents, sourceDiscountCents, sourceApplyServiceFee);

  const currentLines = useMemo<readonly OrderDraftLine[]>(
    () =>
      draftItems ??
      orderItems?.map((line) => ({ itemId: line.itemId, quantity: line.quantity })) ??
      [],
    [draftItems, orderItems],
  );

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog],
  );

  const sellableItems = useMemo(() => catalog.filter((item) => isSellable(item)), [catalog]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (normalized.length === 0) {
      return sellableItems;
    }

    return sellableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.categories.some((category) => category.toLowerCase().includes(normalized)),
    );
  }, [query, sellableItems]);

  const previewLines = useMemo<readonly OrderPreviewLine[]>(
    () =>
      currentLines.map((line) => {
        const catalogItem = catalogById.get(line.itemId);
        const orderLine = orderItems?.find((candidate) => candidate.itemId === line.itemId);

        return {
          itemId: line.itemId,
          itemName: orderLine?.itemName ?? catalogItem?.name ?? 'Item indisponível',
          unitPriceCents: orderLine?.unitPriceCents ?? catalogItem?.priceCents ?? 0,
          imageUrl: catalogItem?.imageUrl ?? null,
          quantity: line.quantity,
        };
      }),
    [catalogById, currentLines, orderItems],
  );

  const applyServiceFee = fields.fee === 'on';
  const serviceFeeBasisPoints = applyServiceFee
    ? order !== null
      ? order.serviceFeeBasisPoints
      : (settings?.serviceFeeBasisPoints ?? 0)
    : 0;

  const preview = useMemo(
    () =>
      buildOrderPreview(previewLines, {
        surchargeCents: parseCentsInput(fields.surcharge),
        discountCents: parseCentsInput(fields.discount),
        applyServiceFee,
        serviceFeeBasisPoints,
      }),
    [applyServiceFee, fields.discount, fields.surcharge, previewLines, serviceFeeBasisPoints],
  );

  const { onPreviewChange } = props;

  useEffect(() => {
    onPreviewChange?.(preview);
  }, [onPreviewChange, preview]);

  const isEditable = canEdit && (orderStatus === null || orderStatus === 'OPEN');
  const displayedError = error ?? actionError;
  const showFeeToggle =
    applyServiceFee || settings?.serviceFeeEnabled === true || order?.applyServiceFee === true;

  const updateFields = useCallback(
    (patch: Partial<PricingFields>) => {
      setPendingPricing((current) => {
        const base =
          current?.key === sourceKey
            ? current.fields
            : toPricingFields(sourceSurchargeCents, sourceDiscountCents, sourceApplyServiceFee);

        return { key: sourceKey, fields: { ...base, ...patch } };
      });
    },
    [sourceApplyServiceFee, sourceDiscountCents, sourceKey, sourceSurchargeCents],
  );

  const runOrderAction = useCallback(
    async (action: () => Promise<OrderResponse>) => {
      setBusy(true);
      setActionError(null);

      try {
        const updatedOrder = await action();

        if (onOrderChange !== null) {
          onOrderChange(updatedOrder);
        }
      } catch (submitError) {
        setActionError(
          submitError instanceof ApiError ? submitError.message : getErrorMessage('INTERNAL_ERROR'),
        );
      } finally {
        setBusy(false);
      }
    },
    [onOrderChange],
  );

  const handleQuantityChange = useCallback(
    (itemId: string, nextQuantity: number) => {
      if (!isEditable || busy) {
        return;
      }

      const quantity = normalizeQuantity(nextQuantity);
      const existingLine = currentLines.find((line) => line.itemId === itemId);

      if (existingLine === undefined && !isSellable(catalogById.get(itemId))) {
        return;
      }

      if (draft !== null && onDraftChange !== null) {
        const items =
          existingLine === undefined
            ? [...draft.items, { itemId, quantity }]
            : draft.items.map((line) => (line.itemId === itemId ? { ...line, quantity } : line));

        onDraftChange({ ...draft, items });
        return;
      }

      if (order === null) {
        return;
      }

      const operation =
        existingLine === undefined
          ? api.orders.addItems(order.id, { items: [{ itemId, quantity }] })
          : api.orders.changeQuantity(order.id, itemId, { quantity });

      void runOrderAction(() => operation);
    },
    [busy, catalogById, currentLines, draft, isEditable, onDraftChange, order, runOrderAction],
  );

  const handleAdd = useCallback(
    (itemId: string) => handleQuantityChange(itemId, 1),
    [handleQuantityChange],
  );

  const handleRemove = useCallback(
    (itemId: string) => {
      if (!isEditable || busy) {
        return;
      }

      if (draft !== null && onDraftChange !== null) {
        onDraftChange({
          ...draft,
          items: draft.items.filter((line) => line.itemId !== itemId),
        });
        return;
      }

      if (order === null) {
        return;
      }

      void runOrderAction(() => api.orders.removeItem(order.id, itemId));
    },
    [busy, draft, isEditable, onDraftChange, order, runOrderAction],
  );

  function handleApplyPricing() {
    if (!isEditable || busy) {
      return;
    }

    const nextSurchargeCents = parseCentsInput(fields.surcharge);
    const nextDiscountCents = clampDiscountCents(
      parseCentsInput(fields.discount),
      preview.maxDiscountCents,
    );
    const nextApplyServiceFee = fields.fee === 'on';

    setPendingPricing({
      key: sourceKey,
      fields: toPricingFields(nextSurchargeCents, nextDiscountCents, nextApplyServiceFee),
    });

    if (draft !== null && onDraftChange !== null) {
      onDraftChange({
        ...draft,
        surchargeCents: nextSurchargeCents,
        discountCents: nextDiscountCents,
        applyServiceFee: nextApplyServiceFee,
      });
      return;
    }

    if (order === null) {
      return;
    }

    void runOrderAction(() =>
      api.orders.setPricing(order.id, {
        surchargeCents: nextSurchargeCents,
        discountCents: nextDiscountCents,
        applyServiceFee: nextApplyServiceFee,
      }),
    );
  }

  function handleRetry() {
    setActionError(null);
    onRetry?.();
  }

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[typography.subtitle, { color: colors.text }]}>Montagem do pedido</Text>
        {isEditable ? null : <Badge label="Bloqueado" tone="warning" icon="lock" />}
        {busy ? (
          <ActivityIndicator color={colors.primary} testID="order-builder-busy" style={styles.busy} />
        ) : null}
      </View>

      {displayedError === null ? null : (
        <View style={styles.error}>
          <ErrorBanner
            message={displayedError}
            testID="order-builder-error"
            onRetry={handleRetry}
          />
        </View>
      )}

      <Field
        label="Buscar no catálogo"
        testID="catalog-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nome ou categoria"
        editable={isEditable}
        containerStyle={{ marginTop: spacing.lg }}
      />

      {preview.lines.length === 0 ? null : (
        <View>
          <Text style={[typography.label, styles.sectionTitle, { marginTop: spacing.lg }]}>
            Itens
          </Text>
          {preview.lines.map((line) => (
            <BuilderLine
              key={line.itemId}
              line={line}
              canEditQuantity={isEditable && isSellable(catalogById.get(line.itemId))}
              canRemove={isEditable}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
            />
          ))}
        </View>
      )}

      <Card style={styles.card} testID="pricing-card">
        <Text style={[typography.label, styles.sectionTitle]}>Preços</Text>
        <Field
          label="Acréscimo (centavos)"
          testID="surcharge-input"
          value={fields.surcharge}
          onChangeText={(value) => updateFields({ surcharge: value })}
          keyboardType="number-pad"
          editable={isEditable}
          containerStyle={styles.field}
        />
        <Field
          label="Desconto (centavos)"
          testID="discount-input"
          value={fields.discount}
          onChangeText={(value) => updateFields({ discount: value })}
          keyboardType="number-pad"
          editable={isEditable}
          containerStyle={styles.field}
        />
        {showFeeToggle ? (
          <Segment
            label="Taxa de serviço"
            testID="service-fee-segment"
            value={fields.fee}
            onChange={(fee) => updateFields({ fee })}
            options={[
              { label: 'Incluir taxa', value: 'on', disabled: !isEditable },
              { label: 'Sem taxa', value: 'off', disabled: !isEditable },
            ]}
          />
        ) : null}
        <Text style={styles.caption}>
          {`Desconto máximo: ${preview.maxDiscountCents} centavos`}
        </Text>
        <View style={styles.pricingActions}>
          <Button
            label="Aplicar preços"
            onPress={handleApplyPricing}
            disabled={!isEditable || busy}
            variant="secondary"
            fullWidth
            testID="apply-pricing-button"
          />
        </View>
      </Card>

      <Card style={styles.card} testID="pricing-preview">
        <SummaryRow label="Subtotal" cents={preview.subtotalCents} testID="preview-subtotal" />
        <SummaryRow label="Acréscimo" cents={preview.surchargeCents} testID="preview-surcharge" />
        <SummaryRow label="Desconto" cents={-preview.discountCents} testID="preview-discount" />
        <SummaryRow label="Taxa de serviço" cents={preview.serviceFeeCents} testID="preview-fee" />
        <SummaryRow label="Total" cents={preview.totalCents} testID="preview-total" total />
      </Card>

      <Text style={[typography.label, styles.sectionTitle]}>Catálogo</Text>
    </View>
  );

  if (loading) {
    return <LoadingState message="Carregando catálogo..." testID="order-builder-loading" />;
  }

  return (
    <FlatList
      testID="order-builder"
      data={filteredItems}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <EmptyState
          title="Nenhum item encontrado"
          description="Tente outro termo de busca ou adicione itens no catálogo."
          icon="search"
        />
      }
      renderItem={({ item }) => {
        const quantity = currentLines.find((line) => line.itemId === item.id)?.quantity ?? 0;

        return (
          <CatalogRow
            item={item}
            quantity={quantity}
            disabled={!isEditable || busy}
            onAdd={handleAdd}
            onQuantityChange={handleQuantityChange}
          />
        );
      }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    />
  );
}
