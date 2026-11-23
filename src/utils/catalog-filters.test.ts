import type { ItemResponse } from '@/types';
import { EMPTY_CATALOG_FILTERS, filterCatalogItems } from '@/utils/catalog-filters';

function makeItem(id: string, name: string, category: string, description: string | null): ItemResponse {
  return {
    id,
    name,
    description,
    category,
    priceCents: 1000,
    imageUrl: null,
    enabled: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const items = [
  makeItem('1', 'Espresso', 'Drinks', 'Strong coffee'),
  makeItem('2', 'Croissant', 'Bakery', 'Butter pastry'),
  makeItem('3', 'Iced Latte', 'Drinks', null),
];

describe('filterCatalogItems', () => {
  it('returns all loaded items when no filter is applied', () => {
    expect(filterCatalogItems(items, EMPTY_CATALOG_FILTERS)).toEqual(items);
  });

  it('matches names, categories, and descriptions case-insensitively', () => {
    expect(filterCatalogItems(items, { search: 'COFFEE', category: '' })).toEqual([items[0]]);
    expect(filterCatalogItems(items, { search: 'latte', category: '' })).toEqual([items[2]]);
  });

  it('filters by exact category and combines it with search', () => {
    expect(filterCatalogItems(items, { search: '', category: ' drinks ' })).toEqual([
      items[0],
      items[2],
    ]);
    expect(filterCatalogItems(items, { search: 'iced', category: 'Drinks' })).toEqual([items[2]]);
    expect(filterCatalogItems(items, { search: 'croissant', category: 'Drinks' })).toEqual([]);
  });
});
