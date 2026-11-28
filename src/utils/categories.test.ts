import {
  CATEGORY_NAME_MAX_LENGTH,
  MAX_ITEM_CATEGORIES,
  categoryKey,
  formatCategories,
  normalizeCategory,
  validateCategory,
} from '@/utils/categories';

describe('category helpers', () => {
  it('normalizes and lowercases category names for comparison', () => {
    expect(normalizeCategory('  Drinks  ')).toBe('Drinks');
    expect(categoryKey('  Drinks  ')).toBe('drinks');
    expect(categoryKey('DRINKS')).toBe(categoryKey('drinks'));
  });

  it('accepts a new unique category', () => {
    expect(validateCategory(' Drinks ', ['Bakery'])).toBeNull();
  });

  it('rejects empty, oversized, duplicate, and excess categories', () => {
    expect(validateCategory('   ', [])).toBe('Informe o nome da categoria.');
    expect(validateCategory('x'.repeat(CATEGORY_NAME_MAX_LENGTH + 1), [])).toBe(
      `Uma categoria não pode ultrapassar ${CATEGORY_NAME_MAX_LENGTH} caracteres.`,
    );
    expect(validateCategory('drinks', ['Drinks'])).toBe('Esta categoria já está na lista.');
    expect(
      validateCategory('Vegan', Array.from({ length: MAX_ITEM_CATEGORIES }, (_, index) => `C${index}`)),
    ).toBe(`Um item não pode ter mais de ${MAX_ITEM_CATEGORIES} categorias.`);
  });

  it('formats all categories with a fallback for uncategorized items', () => {
    expect(formatCategories(['Drinks', 'Vegan'])).toBe('Drinks, Vegan');
    expect(formatCategories([])).toBe('Sem categoria');
    expect(formatCategories([], 'Drinks')).toBe('Drinks');
  });
});
