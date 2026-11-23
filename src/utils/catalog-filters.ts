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

/** Filters the loaded page locally because the catalog endpoint does not expose search parameters. */
export function filterCatalogItems(
  items: readonly ItemResponse[],
  filters: CatalogFilters,
): readonly ItemResponse[] {
  const term = normalize(filters.search);
  const category = normalize(filters.category);

  return items.filter((item) => {
    if (category !== '' && normalize(item.category) !== category) {
      return false;
    }

    if (term === '') {
      return true;
    }

    const haystack = normalize(`${item.name} ${item.category} ${item.description ?? ''}`);
    return haystack.includes(term);
  });
}
