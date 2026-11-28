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
    expect(validateCategory('   ', [])).toBe('Enter a category name.');
    expect(validateCategory('x'.repeat(CATEGORY_NAME_MAX_LENGTH + 1), [])).toBe(
      `A category cannot exceed ${CATEGORY_NAME_MAX_LENGTH} characters.`,
    );
    expect(validateCategory('drinks', ['Drinks'])).toBe('This category is already listed.');
    expect(
      validateCategory('Vegan', Array.from({ length: MAX_ITEM_CATEGORIES }, (_, index) => `C${index}`)),
    ).toBe(`An item cannot have more than ${MAX_ITEM_CATEGORIES} categories.`);
  });

  it('formats all categories with a fallback for uncategorized items', () => {
    expect(formatCategories(['Drinks', 'Vegan'])).toBe('Drinks, Vegan');
    expect(formatCategories([])).toBe('Uncategorized');
    expect(formatCategories([], 'Drinks')).toBe('Drinks');
  });
});
