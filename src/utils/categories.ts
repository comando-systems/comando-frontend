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
    return 'Enter a category name.';
  }

  if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    return `A category cannot exceed ${CATEGORY_NAME_MAX_LENGTH} characters.`;
  }

  if (existing.some((category) => categoryKey(category) === categoryKey(name))) {
    return 'This category is already listed.';
  }

  if (existing.length >= MAX_ITEM_CATEGORIES) {
    return `An item cannot have more than ${MAX_ITEM_CATEGORIES} categories.`;
  }

  return null;
}

/** Comma-separated display form used in catalog rows and search summaries. */
export function formatCategories(
  categories: readonly string[],
  fallback = 'Uncategorized',
): string {
  return categories.length === 0 ? fallback : categories.join(', ');
}
