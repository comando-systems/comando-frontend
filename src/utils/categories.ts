export const MAX_ITEM_CATEGORIES = 8;
export const CATEGORY_NAME_MAX_LENGTH = 80;

export function normalizeCategory(value: string): string {
  return value.trim();
}

export function categoryKey(value: string): string {
  return normalizeCategory(value).toLocaleLowerCase('en-US');
}

/** Validates a single category before it is added to an item. */
export function validateCategory(
  value: string,
  existing: readonly string[],
): string | null {
  const name = normalizeCategory(value);

  if (name.length === 0) {
    return 'Informe o nome da categoria.';
  }

  if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    return `Uma categoria não pode ultrapassar ${CATEGORY_NAME_MAX_LENGTH} caracteres.`;
  }

  if (existing.some((category) => categoryKey(category) === categoryKey(name))) {
    return 'Esta categoria já está na lista.';
  }

  if (existing.length >= MAX_ITEM_CATEGORIES) {
    return `Um item não pode ter mais de ${MAX_ITEM_CATEGORIES} categorias.`;
  }

  return null;
}

/** Comma-separated display form used in catalog rows and search summaries. */
export function formatCategories(
  categories: readonly string[],
  fallback = 'Sem categoria',
): string {
  return categories.length === 0 ? fallback : categories.join(', ');
}
