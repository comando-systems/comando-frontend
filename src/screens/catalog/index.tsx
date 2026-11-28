import { Redirect, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CategoryEditor } from '@/components/category-editor';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { Icon } from '@/components/icon';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { Pagination } from '@/components/pagination';
import { Screen } from '@/components/screen';
import { Segment, type SegmentOption } from '@/components/segment';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, radii, spacing, typography } from '@/theme';
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
import { formatPriceInput, maskPriceInput, parsePriceToCents } from '@/utils/money';
import { permissions } from '@/utils/permissions';

const PAGE_SIZE = 20;
const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

const styles = StyleSheet.create({
  spacingMd: {
    marginTop: spacing.md,
  },
  spacingLg: {
    marginTop: spacing.lg,
  },
  flexOne: {
    flex: 1,
  },
  labelText: {
    color: colors.text,
    ...typography.label,
  },
  subtitleText: {
    color: colors.text,
    ...typography.subtitle,
  },
  bodyText: {
    color: colors.text,
    ...typography.body,
  },
  captionMutedSpaced: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    ...typography.caption,
  },
  enabledRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  enabledCopy: {
    flex: 1,
    marginRight: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionRowSm: {
    marginTop: spacing.sm,
  },
  actionRowMd: {
    marginTop: spacing.md,
  },
  actionHalf: {
    flex: 1,
    marginRight: spacing.sm,
  },
  confirmPanel: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  itemImageWrap: {
    marginRight: spacing.md,
  },
  itemImage: {
    borderRadius: radii.sm,
    height: 32,
    width: 32,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});

const visibilityOptions: readonly SegmentOption<'active' | 'all'>[] = [
  { value: 'active', label: 'Catálogo ativo' },
  { value: 'all', label: 'Incluir removidos' },
];

interface ItemFormValues {
  readonly name: string;
  readonly description: string;
  readonly categories: readonly string[];
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
  readonly onAction: (kind: CatalogActionKind, item: ItemResponse) => void;
}

function validateItemForm(values: ItemFormValues): string | null {
  if (values.name.trim().length === 0) {
    return 'Informe o nome do produto.';
  }

  if (values.categories.length === 0) {
    return 'Adicione pelo menos uma categoria.';
  }

  if (parsePriceToCents(values.price) === null) {
    return 'Informe um preço com até duas casas decimais.';
  }

  const imageUrl = values.imageUrl.trim();

  if (imageUrl.length > 0 && !IMAGE_URL_PATTERN.test(imageUrl)) {
    return 'Informe uma URL de imagem válida começando com http:// ou https://.';
  }

  return null;
}

function ItemForm({ initialItem, busy, error, onSubmit, onCancel, onAction }: ItemFormProps) {
  const isEdit = initialItem !== null;
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [values, setValues] = useState<ItemFormValues>({
    name: initialItem?.name ?? '',
    description: initialItem?.description ?? '',
    categories: initialItem?.categories ?? [],
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
      imageUrl: values.imageUrl.trim(),
    });
  };

  return (
    <Screen scroll title={isEdit ? 'Editar produto' : 'Adicionar item'} subtitle="Gerenciamento do catálogo">
      <Form
        testID="catalog-item-form"
        submit={isEdit ? 'Salvar produto' : 'Adicionar item'}
        onSubmit={handleSubmit}
        cancel="Cancelar"
        onCancel={onCancel}
        submitButtonProps={{ loading: busy, icon: 'check', size: 'lg', testID: 'catalog-item-submit' }}
        cancelButtonProps={{ disabled: busy, testID: 'catalog-item-cancel' }}
      >
        <Field
          label="Nome"
          value={values.name}
          onChangeText={(name) => update('name', name)}
          placeholder="Nome do produto"
          editable={!busy}
          testID="catalog-item-name"
        />
        <View style={styles.spacingMd}>
          <Field
            label="Descrição (opcional)"
            value={values.description}
            onChangeText={(description) => update('description', description)}
            placeholder="Descrição curta"
            multiline
            numberOfLines={3}
            editable={!busy}
            testID="catalog-item-description"
          />
        </View>
        <View style={styles.spacingMd}>
          <CategoryEditor
            value={values.categories}
            onChange={(categories) => update('categories', categories)}
            disabled={busy}
            testID="catalog-item-categories"
          />
        </View>
        <View style={styles.spacingMd}>
          <Field
            label="Preço"
            value={values.price}
            onChangeText={(price) => update('price', maskPriceInput(price))}
            placeholder="12.50"
            helper="Valor em reais com até duas casas decimais."
            keyboardType="decimal-pad"
            autoCorrect={false}
            editable={!busy}
            testID="catalog-item-price"
          />
        </View>
        <View style={styles.spacingMd}>
          <Field
            label="URL da imagem (opcional)"
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
        <View style={styles.enabledRow}>
          <View style={styles.enabledCopy}>
            <Text style={styles.labelText}>Ativado</Text>
            <Text style={styles.captionMutedSpaced}>
              Produtos desativados não podem ser vendidos, mas continuam editáveis.
            </Text>
          </View>
          <Switch
            value={values.enabled}
            onValueChange={(enabled) => update('enabled', enabled)}
            disabled={busy}
            accessibilityLabel="Ativado"
            testID="catalog-item-enabled"
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {isEdit && initialItem.isActive ? (
          <View style={styles.spacingLg}>
            <Text style={styles.labelText}>Ações do produto</Text>
            <View style={[styles.actionRow, styles.actionRowSm]}>
              <View style={styles.actionHalf}>
                <Button
                  label={initialItem.enabled ? 'Desativar' : 'Ativar'}
                  onPress={() =>
                    setPendingAction({
                      kind: initialItem.enabled ? 'disable' : 'enable',
                      item: initialItem,
                    })
                  }
                  variant="secondary"
                  disabled={busy}
                  testID={`catalog-${initialItem.enabled ? 'disable' : 'enable'}-${initialItem.id}`}
                />
              </View>
              <View style={styles.flexOne}>
                <Button
                  label="Remover item"
                  onPress={() => setPendingAction({ kind: 'remove', item: initialItem })}
                  variant="secondary"
                  disabled={busy}
                  testID={`catalog-remove-${initialItem.id}`}
                />
              </View>
            </View>
          </View>
        ) : null}

        {pendingAction === null ? null : (
          <View style={styles.confirmPanel}>
            <Text style={styles.bodyText} testID="catalog-confirm-copy">
              {actionCopy(pendingAction)}
            </Text>
            <View style={[styles.actionRow, styles.actionRowMd]}>
              <View style={styles.actionHalf}>
                <Button
                  label="Cancelar"
                  onPress={() => setPendingAction(null)}
                  variant="secondary"
                  disabled={busy}
                  testID="catalog-action-cancel"
                />
              </View>
              <View style={styles.flexOne}>
                <Button
                  label={actionButtonLabel(pendingAction.kind)}
                  onPress={() => onAction(pendingAction.kind, pendingAction.item)}
                  loading={busy}
                  variant="primary"
                  testID="catalog-action-confirm"
                />
              </View>
            </View>
          </View>
        )}

        {validationError === null && error === null ? null : (
          <View style={styles.spacingMd}>
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

function actionCopy(action: PendingAction): string {
  if (action.kind === 'remove') {
    return `Remover ${action.item.name} do catálogo? Produtos removidos permanecem no histórico de pedidos e não podem ser vendidos.`;
  }

  if (action.kind === 'disable') {
    return `Desativar ${action.item.name}? Produtos desativados não podem ser vendidos, mas continuam editáveis.`;
  }

  return `Ativar ${action.item.name}? Ele estará disponível para venda novamente.`;
}

function actionButtonLabel(kind: CatalogActionKind): string {
  if (kind === 'remove') return 'Remover item';
  if (kind === 'disable') return 'Desativar';
  return 'Ativar';
}

interface ItemRowProps {
  readonly item: ItemResponse;
  readonly onEdit: (item: ItemResponse) => void;
}

const ItemRow = memo(function ItemRow({ item, onEdit }: ItemRowProps) {
  return (
    <Card
      testID={`catalog-item-${item.id}`}
      onPress={() => onEdit(item)}
      style={styles.itemRow}
    >
      <View style={styles.itemImageWrap}>
        {item.imageUrl === null ? (
          <Icon
            name="food"
            size="md"
            color={colors.primaryDark}
            testID={`catalog-item-icon-${item.id}`}
          />
        ) : (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
            testID={`catalog-item-image-${item.id}`}
          />
        )}
      </View>
      <View style={styles.flexOne}>
        <Text
          style={styles.labelText}
          numberOfLines={1}
          testID={`catalog-item-name-${item.id}`}
        >
          {item.name}
        </Text>
        <MoneyText cents={item.priceCents} size="sm" testID={`catalog-price-${item.id}`} />
      </View>
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
        setError('Informe um preço com até duas casas decimais.');
        return;
      }

      setBusy(true);
      setError(null);

      try {
        if (mode.kind === 'create') {
          const body: CreateItemRequest = {
            name: values.name,
            description: values.description.length === 0 ? null : values.description,
            category: values.categories[0],
            categories: values.categories,
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
            category: values.categories[0],
            categories: values.categories,
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

  const runItemAction = useCallback(
    async (kind: CatalogActionKind, item: ItemResponse) => {
      setBusy(true);
      setError(null);

      try {
        const updated =
          kind === 'remove'
            ? await api.items.remove(item.id)
            : await api.items.update(item.id, { enabled: kind === 'enable' });

        applyReturnedItem(updated);
        setMode({ kind: 'list' });
      } catch (actionError) {
        setError(toErrorMessage(actionError));
      } finally {
        setBusy(false);
      }
    },
    [applyReturnedItem],
  );

  const openCreate = useCallback(() => {
    setError(null);
    setMode({ kind: 'create' });
  }, []);

  const openEdit = useCallback((item: ItemResponse) => {
    setError(null);
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
        onAction={(kind, item) => void runItemAction(kind, item)}
      />
    );
  }

  if (loading && items.length === 0) {
    return (
      <Screen title="Catálogo" subtitle="Produtos disponíveis para venda e preços">
        <LoadingState message="Carregando catálogo..." testID="catalog-loading" />
      </Screen>
    );
  }

  const totalPages = Math.max(pagination.totalPages, 1);
  const hasFilters = filters.search.trim().length > 0 || filters.category.trim().length > 0;

  const listHeader = (
    <View>
      <Card testID="catalog-filters">
        <Text style={styles.subtitleText}>Catálogo</Text>
        <View style={styles.spacingMd}>
          <Segment
            label="Visibilidade do catálogo"
            value={includeRemoved ? 'all' : 'active'}
            onChange={(value) => {
              setIncludeRemoved(value === 'all');
              setPage(1);
            }}
            options={visibilityOptions}
            testID="catalog-visibility"
          />
        </View>
        <View style={styles.spacingMd}>
          <Field
            label="Buscar"
            value={filters.search}
            onChangeText={(search) => setFilters((current) => ({ ...current, search }))}
            placeholder="Nome, categoria ou descrição"
            autoCorrect={false}
            editable={!refreshing}
            testID="catalog-search"
          />
        </View>
        <View style={styles.spacingMd}>
          <Field
            label="Categorias"
            value={filters.category}
            onChangeText={(category) => setFilters((current) => ({ ...current, category }))}
            placeholder="Qualquer categoria"
            autoCorrect={false}
            editable={!refreshing}
            testID="catalog-category-filter"
          />
        </View>
        {hasFilters ? (
          <View style={styles.spacingMd}>
            <Button
              label="Limpar filtros"
              onPress={() => setFilters(EMPTY_CATALOG_FILTERS)}
              variant="tertiary"
              testID="catalog-clear-filters"
            />
          </View>
        ) : null}
        <View style={styles.spacingMd}>
          <Button
            label="Adicionar item"
            onPress={openCreate}
            icon="add"
            fullWidth
            testID="catalog-add-item"
          />
        </View>
        {error === null ? null : (
          <View style={styles.spacingMd}>
            <ErrorBanner
              message={error}
              onRetry={() => {
                void loadItems(page, includeRemoved, true);
              }}
              testID="catalog-error"
            />
          </View>
        )}
      </Card>
    </View>
  );

  const listFooter = (
    <Card testID="catalog-pagination" style={styles.spacingMd}>
      <Text style={styles.labelText} testID="catalog-page-label">
        {`Página ${page} de ${totalPages}`}
      </Text>
      <View style={styles.spacingMd}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          testID="catalog-pages"
        />
      </View>
    </Card>
  );

  return (
    <Screen title="Catálogo" subtitle="Produtos disponíveis para venda e preços">
      <FlatList
        testID="catalog-list"
        data={visibleItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum produto encontrado"
            description="Nenhum produto do catálogo corresponde à visualização atual."
            icon="food"
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadItems(page, includeRemoved, true)} />
        }
        renderItem={({ item }) => <ItemRow item={item} onEdit={openEdit} />}
      />
    </Screen>
  );
}
