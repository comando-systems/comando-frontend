import { Redirect, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { Screen } from '@/components/screen';
import { Segment, type SegmentOption } from '@/components/segment';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type {
  CreateItemRequest,
  ItemResponse,
  PageResponse,
  UpdateItemRequest,
} from '@/types';
import {
  EMPTY_CATALOG_FILTERS,
  type CatalogFilters,
  filterCatalogItems,
} from '@/utils/catalog-filters';
import { toErrorMessage } from '@/utils/errors';
import { formatPriceInput, parsePriceToCents } from '@/utils/money';
import { permissions } from '@/utils/permissions';

const PAGE_SIZE = 20;
const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

const visibilityOptions: readonly SegmentOption<'active' | 'all'>[] = [
  { value: 'active', label: 'Active catalog' },
  { value: 'all', label: 'Include removed' },
];

interface ItemFormValues {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly price: string;
  readonly imageUrl: string;
  readonly enabled: boolean;
}

type CatalogMode =
  | { readonly kind: 'list' }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly item: ItemResponse };

type CatalogActionKind = 'enable' | 'disable' | 'remove';

interface PendingAction {
  readonly kind: CatalogActionKind;
  readonly item: ItemResponse;
}

interface ItemFormProps {
  readonly initialItem: ItemResponse | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (values: ItemFormValues) => void;
  readonly onCancel: () => void;
}

function validateItemForm(values: ItemFormValues): string | null {
  if (values.name.trim().length === 0) {
    return 'Enter an item name.';
  }

  if (values.category.trim().length === 0) {
    return 'Enter a category.';
  }

  if (parsePriceToCents(values.price) === null) {
    return 'Enter a price with up to two decimal places.';
  }

  const imageUrl = values.imageUrl.trim();

  if (imageUrl.length > 0 && !IMAGE_URL_PATTERN.test(imageUrl)) {
    return 'Enter a valid image URL starting with http:// or https://.';
  }

  return null;
}

function ItemForm({ initialItem, busy, error, onSubmit, onCancel }: ItemFormProps) {
  const isEdit = initialItem !== null;
  const [values, setValues] = useState<ItemFormValues>({
    name: initialItem?.name ?? '',
    description: initialItem?.description ?? '',
    category: initialItem?.category ?? '',
    price: initialItem === null ? '' : formatPriceInput(initialItem.priceCents),
    imageUrl: initialItem?.imageUrl ?? '',
    enabled: initialItem?.enabled ?? true,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => {
    setValidationError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = () => {
    const nextError = validateItemForm(values);

    if (nextError !== null) {
      setValidationError(nextError);
      return;
    }

    setValidationError(null);
    onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      imageUrl: values.imageUrl.trim(),
    });
  };

  return (
    <Screen scroll title={isEdit ? 'Edit item' : 'Add item'} subtitle="Catalog management">
      <Form
        testID="catalog-item-form"
        submit={isEdit ? 'Save item' : 'Add item'}
        onSubmit={handleSubmit}
        cancel="Cancel"
        onCancel={onCancel}
        submitButtonProps={{ loading: busy, icon: 'check', size: 'lg', testID: 'catalog-item-submit' }}
        cancelButtonProps={{ disabled: busy, testID: 'catalog-item-cancel' }}
      >
        <Field
          label="Name"
          value={values.name}
          onChangeText={(name) => update('name', name)}
          placeholder="Item name"
          editable={!busy}
          testID="catalog-item-name"
        />
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Description (optional)"
            value={values.description}
            onChangeText={(description) => update('description', description)}
            placeholder="Short description"
            multiline
            numberOfLines={3}
            editable={!busy}
            testID="catalog-item-description"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Category"
            value={values.category}
            onChangeText={(category) => update('category', category)}
            placeholder="Drinks"
            maxLength={80}
            editable={!busy}
            testID="catalog-item-category"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Price"
            value={values.price}
            onChangeText={(price) => update('price', price)}
            placeholder="12.50"
            helper="Amount in Brazilian currency with up to two decimal places."
            keyboardType="decimal-pad"
            autoCorrect={false}
            editable={!busy}
            testID="catalog-item-price"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Image URL (optional)"
            value={values.imageUrl}
            onChangeText={(imageUrl) => update('imageUrl', imageUrl)}
            placeholder="https://example.com/item.jpg"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!busy}
            testID="catalog-item-image"
          />
        </View>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: spacing.lg,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={[typography.label, { color: colors.text }]}>Enabled</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
              Disabled items cannot be sold but remain editable.
            </Text>
          </View>
          <Switch
            value={values.enabled}
            onValueChange={(enabled) => update('enabled', enabled)}
            disabled={busy}
            accessibilityLabel="Enabled"
            testID="catalog-item-enabled"
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {validationError === null && error === null ? null : (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner
              message={validationError ?? error ?? ''}
              testID="catalog-item-form-error"
            />
          </View>
        )}

      </Form>
    </Screen>
  );
}

function itemStatus(item: ItemResponse): { label: string; tone: BadgeTone } {
  if (!item.isActive) {
    return { label: 'Removed', tone: 'danger' };
  }

  if (!item.enabled) {
    return { label: 'Disabled', tone: 'warning' };
  }

  return { label: 'Active', tone: 'success' };
}

function actionCopy(action: PendingAction): string {
  if (action.kind === 'remove') {
    return `Remove ${action.item.name} from the catalog? Removed items stay in order history and cannot be sold.`;
  }

  if (action.kind === 'disable') {
    return `Disable ${action.item.name}? Disabled items cannot be sold but remain editable.`;
  }

  return `Enable ${action.item.name}? It will be available for sale again.`;
}

function actionButtonLabel(kind: CatalogActionKind): string {
  if (kind === 'remove') return 'Remove item';
  if (kind === 'disable') return 'Disable item';
  return 'Enable item';
}

interface ItemRowProps {
  readonly item: ItemResponse;
  readonly busy: boolean;
  readonly onEdit: (item: ItemResponse) => void;
  readonly onAction: (kind: CatalogActionKind, item: ItemResponse) => void;
}

const ItemRow = memo(function ItemRow({ item, busy, onEdit, onAction }: ItemRowProps) {
  const status = itemStatus(item);

  return (
    <Card testID={`catalog-item-${item.id}`} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.subtitle, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
          {item.name}
        </Text>
        <Badge
          label={status.label}
          tone={status.tone}
          testID={`catalog-status-${item.id}`}
        />
      </View>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {item.category}
      </Text>
      <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
        {item.description === null || item.description.length === 0
          ? 'No description'
          : item.description}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
        <MoneyText cents={item.priceCents} size="md" testID={`catalog-price-${item.id}`} />
      </View>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {`Updated ${item.updatedAt.slice(0, 10)} UTC`}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Button
            label="Edit"
            onPress={() => onEdit(item)}
            variant="secondary"
            disabled={busy}
            testID={`catalog-edit-${item.id}`}
          />
        </View>
        {item.isActive ? (
          <View style={{ flex: 1 }}>
            <Button
              label={item.enabled ? 'Disable' : 'Enable'}
              onPress={() => onAction(item.enabled ? 'disable' : 'enable', item)}
              variant="secondary"
              disabled={busy}
              testID={`catalog-${item.enabled ? 'disable' : 'enable'}-${item.id}`}
            />
          </View>
        ) : null}
      </View>
      {item.isActive ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button
            label="Remove"
            onPress={() => onAction('remove', item)}
            variant="danger"
            disabled={busy}
            fullWidth
            testID={`catalog-remove-${item.id}`}
          />
        </View>
      ) : null}
    </Card>
  );
});

export default function Catalog() {
  const { user } = useSession();
  const [items, setItems] = useState<readonly ItemResponse[]>([]);
  const [pagination, setPagination] = useState<PageResponse<ItemResponse>['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [mode, setMode] = useState<CatalogMode>({ kind: 'list' });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = permissions.canManage(user);

  const loadItems = useCallback(
    async (targetPage: number, targetIncludeRemoved: boolean, isRefresh = false) => {
      if (!canManage) {
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
        const result = await api.items.list({
          page: targetPage,
          pageSize: PAGE_SIZE,
          includeRemoved: targetIncludeRemoved,
        });
        setItems(result.data);
        setPagination(result.pagination);
      } catch (loadError) {
        setError(toErrorMessage(loadError));
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [canManage],
  );

  useFocusEffect(
    useCallback(() => {
      void loadItems(page, includeRemoved);
    }, [includeRemoved, loadItems, page]),
  );

  const applyReturnedItem = useCallback(
    (item: ItemResponse) => {
      setItems((current) => {
        if (!includeRemoved && !item.isActive) {
          return current.filter((entry) => entry.id !== item.id);
        }

        const exists = current.some((entry) => entry.id === item.id);
        return exists
          ? current.map((entry) => (entry.id === item.id ? item : entry))
          : [item, ...current];
      });
    },
    [includeRemoved],
  );

  const saveItem = useCallback(
    async (values: ItemFormValues) => {
      const priceCents = parsePriceToCents(values.price);

      if (priceCents === null) {
        setError('Enter a price with up to two decimal places.');
        return;
      }

      setBusy(true);
      setError(null);

      try {
        if (mode.kind === 'create') {
          const body: CreateItemRequest = {
            name: values.name,
            description: values.description.length === 0 ? null : values.description,
            category: values.category,
            priceCents,
            imageUrl: values.imageUrl.length === 0 ? null : values.imageUrl,
            enabled: values.enabled,
          };
          await api.items.create(body);
          setMode({ kind: 'list' });
          setPage(1);
          await loadItems(1, includeRemoved);
        } else if (mode.kind === 'edit') {
          const body: UpdateItemRequest = {
            name: values.name,
            description: values.description.length === 0 ? null : values.description,
            category: values.category,
            priceCents,
            imageUrl: values.imageUrl.length === 0 ? null : values.imageUrl,
            enabled: values.enabled,
          };
          const updated = await api.items.update(mode.item.id, body);
          applyReturnedItem(updated);
          setMode({ kind: 'list' });
        }
      } catch (submitError) {
        setError(toErrorMessage(submitError));
      } finally {
        setBusy(false);
      }
    },
    [applyReturnedItem, includeRemoved, loadItems, mode],
  );

  const confirmAction = useCallback(async () => {
    if (pendingAction === null) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const updated =
        pendingAction.kind === 'remove'
          ? await api.items.remove(pendingAction.item.id)
          : await api.items.update(pendingAction.item.id, {
              enabled: pendingAction.kind === 'enable',
            });

      applyReturnedItem(updated);
      setPendingAction(null);
    } catch (actionError) {
      setError(toErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }, [applyReturnedItem, pendingAction]);

  const openCreate = useCallback(() => {
    setError(null);
    setPendingAction(null);
    setMode({ kind: 'create' });
  }, []);

  const openEdit = useCallback((item: ItemResponse) => {
    setError(null);
    setPendingAction(null);
    setMode({ kind: 'edit', item });
  }, []);

  const visibleItems = useMemo(() => filterCatalogItems(items, filters), [filters, items]);

  if (!canManage) {
    return <Redirect href="/" />;
  }

  if (mode.kind === 'create' || mode.kind === 'edit') {
    return (
      <ItemForm
        key={mode.kind === 'edit' ? mode.item.id : 'create'}
        initialItem={mode.kind === 'edit' ? mode.item : null}
        busy={busy}
        error={error}
        onSubmit={(values) => void saveItem(values)}
        onCancel={() => {
          setError(null);
          setMode({ kind: 'list' });
        }}
      />
    );
  }

  if (loading && items.length === 0) {
    return (
      <Screen title="Catalog" subtitle="Sellable items and prices">
        <LoadingState message="Loading catalog..." testID="catalog-loading" />
      </Screen>
    );
  }

  const totalPages = Math.max(pagination.totalPages, 1);
  const hasFilters = filters.search.trim().length > 0 || filters.category.trim().length > 0;

  const listHeader = (
    <View>
      <Card testID="catalog-filters">
        <Text style={[typography.subtitle, { color: colors.text }]}>Catalog</Text>
        <View style={{ marginTop: spacing.md }}>
          <Segment
            label="Catalog visibility"
            value={includeRemoved ? 'all' : 'active'}
            onChange={(value) => {
              setIncludeRemoved(value === 'all');
              setPage(1);
            }}
            options={visibilityOptions}
            testID="catalog-visibility"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Search"
            value={filters.search}
            onChangeText={(search) => setFilters((current) => ({ ...current, search }))}
            placeholder="Name, category, or description"
            autoCorrect={false}
            editable={!refreshing}
            testID="catalog-search"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Category"
            value={filters.category}
            onChangeText={(category) => setFilters((current) => ({ ...current, category }))}
            placeholder="Any category"
            autoCorrect={false}
            editable={!refreshing}
            testID="catalog-category-filter"
          />
        </View>
        {hasFilters ? (
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Clear filters"
              onPress={() => setFilters(EMPTY_CATALOG_FILTERS)}
              variant="ghost"
              testID="catalog-clear-filters"
            />
          </View>
        ) : null}
        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Add item"
            onPress={openCreate}
            icon="add"
            fullWidth
            testID="catalog-add-item"
          />
        </View>
        {error === null ? null : (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner
              message={error}
              onRetry={() => {
                void loadItems(page, includeRemoved, true);
              }}
              testID="catalog-error"
            />
          </View>
        )}
        {pendingAction === null ? null : (
          <View
            style={{
              backgroundColor: colors.warningSoft,
              borderRadius: 10,
              marginTop: spacing.md,
              padding: spacing.md,
            }}
          >
            <Text style={[typography.body, { color: colors.text }]} testID="catalog-confirm-copy">
              {actionCopy(pendingAction)}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Button
                  label="Cancel"
                  onPress={() => setPendingAction(null)}
                  variant="secondary"
                  disabled={busy}
                  testID="catalog-action-cancel"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={actionButtonLabel(pendingAction.kind)}
                  onPress={() => void confirmAction()}
                  loading={busy}
                  variant={pendingAction.kind === 'remove' ? 'danger' : 'primary'}
                  testID="catalog-action-confirm"
                />
              </View>
            </View>
          </View>
        )}
      </Card>
    </View>
  );

  const listFooter = (
    <Card testID="catalog-pagination" style={{ marginTop: spacing.md }}>
      <Text style={[typography.label, { color: colors.text }]} testID="catalog-page-label">
        {`Page ${page} of ${totalPages}`}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Button
            label="Previous"
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            variant="secondary"
            disabled={page <= 1}
            testID="catalog-previous"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Next"
            onPress={() => setPage((current) => current + 1)}
            variant="secondary"
            disabled={page >= totalPages}
            testID="catalog-next"
          />
        </View>
      </View>
    </Card>
  );

  return (
    <Screen title="Catalog" subtitle="Sellable items and prices">
      <FlatList
        testID="catalog-list"
        data={visibleItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <EmptyState
            title="No items found"
            description="No catalog items match the current view."
            icon="food"
          />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadItems(page, includeRemoved, true)} />
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            busy={busy}
            onEdit={openEdit}
            onAction={(kind, target) => {
              setError(null);
              setPendingAction({ kind, item: target });
            }}
          />
        )}
      />
    </Screen>
  );
}
