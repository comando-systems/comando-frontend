import type { ItemResponse } from '@/types';

export interface CatalogFilters {
  readonly search: string;
  readonly category: string;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  search: '',
  category: '',
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

/**
 * Filters the loaded page locally. The backend search only covers the primary category,
 * so the client also looks at secondary categories and applies the category filter locally.
 */
export function filterCatalogItems(
  items: readonly ItemResponse[],
  filters: CatalogFilters,
): readonly ItemResponse[] {
  const term = normalize(filters.search);
  const category = normalize(filters.category);

  return items.filter((item) => {
    if (category !== '' && !item.categories.some((entry) => normalize(entry) === category)) {
      return false;
    }

    if (term === '') {
      return true;
    }

    const haystack = normalize(
      `${item.name} ${item.categories.join(' ')} ${item.description ?? ''}`,
    );
    return haystack.includes(term);
  });
}
