import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Redirect, useFocusEffect } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Catalog from '@/screens/catalog';
import type { CreateItemRequest, ItemResponse, PageResponse, UpdateItemRequest } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

const createdAt = '2026-01-01T00:00:00.000Z';

function makeItem(
  id: string,
  name: string,
  category: string,
  priceCents: number,
  enabled = true,
  isActive = true,
  categories: readonly string[] = [category],
): ItemResponse {
  return {
    id,
    name,
    description: `${name} description`,
    category,
    categories,
    priceCents,
    imageUrl: null,
    enabled,
    isActive,
    createdAt,
    updatedAt: createdAt,
  };
}

function makePage(
  data: readonly ItemResponse[],
  page: number,
  totalPages: number,
  total = data.length,
): PageResponse<ItemResponse> {
  return {
    data,
    pagination: { page, pageSize: 20, total, totalPages },
  };
}

function mockRoles(roles: readonly ('ADMIN' | 'CASHIER' | 'SERVER')[]) {
  jest.mocked(useSession).mockReturnValue({
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: toRoleSet(roles),
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    },
  } as unknown as ReturnType<typeof useSession>);
}

async function openCreateForm() {
  await fireEvent.press(await screen.findByTestId('catalog-add-item'));
  expect(await screen.findByTestId('catalog-item-form')).toBeTruthy();
}

describe('<Catalog />', () => {
  const active = {
    ...makeItem('1', 'Espresso', 'Drinks', 1250, true, true, ['Drinks', 'Bebidas quentes']),
    description: 'Strong coffee',
  };
  const disabled = makeItem('2', 'Croissant', 'Bakery', 500, false);
  const removed = makeItem('3', 'Old Cake', 'Bakery', 700, true, false);

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      useEffect(() => {
        effect();
      }, [effect]);
    });
    mockRoles(['ADMIN']);
    jest.spyOn(api.items, 'list').mockResolvedValue(makePage([active, disabled], 1, 1, 2));
    jest.spyOn(api.items, 'create').mockResolvedValue(active);
    jest.spyOn(api.items, 'update').mockImplementation(async (id, body) => {
      const base = id === '1' ? active : disabled;
      return { ...base, ...body };
    });
    jest.spyOn(api.items, 'remove').mockResolvedValue({ ...disabled, isActive: false });
  });

  it('lists items with status, price, and supported pagination parameters', async () => {
    await render(<Catalog />);

    expect(await screen.findByTestId('catalog-item-1')).toBeTruthy();
    expect(screen.getByTestId('catalog-item-2')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Disabled')).toBeTruthy();
    expect(screen.getByTestId('catalog-price-1').props.children).toBe('R$12.50');
    expect(api.items.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      includeRemoved: false,
    });
  });

  it('navigates pages and shows removed items when includeRemoved is enabled', async () => {
    jest.spyOn(api.items, 'list').mockImplementation(async (query) => {
      if (query?.includeRemoved === true) {
        return makePage([active, disabled, removed], query.page ?? 1, 2, 25);
      }

      return makePage([active, disabled], query?.page ?? 1, 1, 2);
    });

    await render(<Catalog />);
    await screen.findByTestId('catalog-item-1');

    await fireEvent.press(screen.getByTestId('catalog-visibility-all'));

    await waitFor(() =>
      expect(api.items.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        includeRemoved: true,
      }),
    );
    expect(await screen.findByTestId('catalog-item-3')).toBeTruthy();
    expect(screen.getByText('Removed')).toBeTruthy();
    expect(screen.getByTestId('catalog-next').props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(screen.getByTestId('catalog-next'));

    await waitFor(() =>
      expect(api.items.list).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 20,
        includeRemoved: true,
      }),
    );
  });

  it('creates an item with an integer cent price and trims text fields', async () => {
    await render(<Catalog />);
    await openCreateForm();

    await fireEvent.changeText(screen.getByTestId('catalog-item-name'), '  Flat White ');
    await fireEvent.changeText(screen.getByTestId('catalog-item-description'), '  Coffee with milk ');
    await fireEvent.changeText(screen.getByTestId('catalog-item-categories-input'), ' Drinks ');
    await fireEvent.press(screen.getByTestId('catalog-item-categories-add'));
    await fireEvent.changeText(screen.getByTestId('catalog-item-price'), '14.90');
    await fireEvent.changeText(screen.getByTestId('catalog-item-image'), ' https://example.com/flat.jpg ');
    await fireEvent.press(screen.getByTestId('catalog-item-submit'));

    await waitFor(() =>
      expect(api.items.create).toHaveBeenCalledWith({
        name: 'Flat White',
        description: 'Coffee with milk',
        category: 'Drinks',
        categories: ['Drinks'],
        priceCents: 1490,
        imageUrl: 'https://example.com/flat.jpg',
        enabled: true,
      } satisfies CreateItemRequest),
    );
    await waitFor(() => expect(screen.queryByTestId('catalog-item-form')).toBeNull());
  });

  it('validates item input before submitting', async () => {
    await render(<Catalog />);
    await openCreateForm();

    await fireEvent.press(screen.getByTestId('catalog-item-submit'));
    expect(screen.getByText('Enter an item name.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('catalog-item-name'), 'Flat White');
    await fireEvent.press(screen.getByTestId('catalog-item-submit'));
    expect(screen.getByText('Add at least one category.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('catalog-item-categories-input'), 'Drinks');
    await fireEvent.press(screen.getByTestId('catalog-item-categories-add'));
    await fireEvent.changeText(screen.getByTestId('catalog-item-categories-input'), 'drinks');
    await fireEvent.press(screen.getByTestId('catalog-item-categories-add'));
    expect(screen.getByText('This category is already listed.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('catalog-item-price'), '12.345');
    await fireEvent.press(screen.getByTestId('catalog-item-submit'));
    expect(screen.getByText('Enter a price with up to two decimal places.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('catalog-item-price'), '12.50');
    await fireEvent.changeText(screen.getByTestId('catalog-item-image'), 'not-a-url');
    await fireEvent.press(screen.getByTestId('catalog-item-submit'));
    expect(
      screen.getByText('Enter a valid image URL starting with http:// or https://.'),
    ).toBeTruthy();
    expect(api.items.create).not.toHaveBeenCalled();
  });

  it('edits an item using the returned item from the update endpoint', async () => {
    await render(<Catalog />);

    await fireEvent.press(await screen.findByTestId('catalog-edit-2'));
    expect(await screen.findByTestId('catalog-item-price')).toBeTruthy();
    expect(screen.getByTestId('catalog-item-price').props.value).toBe('5.00');

    await fireEvent.changeText(screen.getByTestId('catalog-item-name'), ' Butter Croissant ');
    await fireEvent.changeText(screen.getByTestId('catalog-item-price'), '7,25');
    await fireEvent.press(screen.getByTestId('catalog-item-submit'));

    await waitFor(() =>
      expect(api.items.update).toHaveBeenCalledWith('2', {
        name: 'Butter Croissant',
        description: 'Croissant description',
        category: 'Bakery',
        categories: ['Bakery'],
        priceCents: 725,
        imageUrl: null,
        enabled: false,
      }),
    );
    await waitFor(() => expect(screen.queryByTestId('catalog-item-form')).toBeNull());
  });

  it('shows all assigned categories and replaces the whole set on edit', async () => {
    await render(<Catalog />);
    await screen.findByTestId('catalog-item-1');

    expect(screen.getByTestId('catalog-categories-1').props.children).toBe(
      'Drinks, Bebidas quentes',
    );

    await fireEvent.press(screen.getByTestId('catalog-edit-1'));
    await screen.findByTestId('catalog-item-categories');

    expect(screen.getByText('Bebidas quentes')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('catalog-item-categories-chip-1'));
    await fireEvent.changeText(screen.getByTestId('catalog-item-categories-input'), 'Vegan');
    await fireEvent.press(screen.getByTestId('catalog-item-categories-add'));
    await fireEvent.press(screen.getByTestId('catalog-item-submit'));

    await waitFor(() =>
      expect(api.items.update).toHaveBeenCalledWith('1', {
        name: 'Espresso',
        description: 'Strong coffee',
        category: 'Drinks',
        categories: ['Drinks', 'Vegan'],
        priceCents: 1250,
        imageUrl: null,
        enabled: true,
      } satisfies UpdateItemRequest),
    );
  });

  it('confirms disable and remove actions with English copy', async () => {
    await render(<Catalog />);
    await screen.findByTestId('catalog-item-1');

    await fireEvent.press(screen.getByTestId('catalog-disable-1'));
    expect(screen.getByTestId('catalog-confirm-copy').props.children).toContain(
      'Disable Espresso?',
    );
    await fireEvent.press(screen.getByTestId('catalog-action-confirm'));

    await waitFor(() => expect(api.items.update).toHaveBeenCalledWith('1', { enabled: false }));
    expect(screen.getAllByText('Disabled')).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('catalog-remove-2'));
    expect(screen.getByTestId('catalog-confirm-copy').props.children).toContain(
      'Remove Croissant from the catalog?',
    );
    await fireEvent.press(screen.getByTestId('catalog-action-confirm'));

    await waitFor(() => expect(api.items.remove).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(screen.queryByTestId('catalog-item-2')).toBeNull());
  });

  it('filters the loaded page by search and category', async () => {
    await render(<Catalog />);
    await screen.findByTestId('catalog-item-1');

    await fireEvent.changeText(screen.getByTestId('catalog-search'), 'coffee');

    expect(screen.getByTestId('catalog-item-1')).toBeTruthy();
    expect(screen.queryByTestId('catalog-item-2')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('catalog-search'), '');
    await fireEvent.changeText(screen.getByTestId('catalog-category-filter'), 'Bakery');

    expect(screen.queryByTestId('catalog-item-1')).toBeNull();
    expect(screen.getByTestId('catalog-item-2')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('catalog-category-filter'), 'bebidas quentes');
    expect(screen.getByTestId('catalog-item-1')).toBeTruthy();
    expect(screen.queryByTestId('catalog-item-2')).toBeNull();

    await fireEvent.press(screen.getByTestId('catalog-clear-filters'));

    expect(screen.getByTestId('catalog-item-1')).toBeTruthy();
    expect(screen.getByTestId('catalog-item-2')).toBeTruthy();
  });

  it('shows a fixed English error with retry support', async () => {
    jest
      .spyOn(api.items, 'list')
      .mockRejectedValue(new ApiError({ status: 403, code: 'FORBIDDEN' }));

    await render(<Catalog />);

    expect(await screen.findByText('You are not allowed to perform this action.')).toBeTruthy();

    jest.spyOn(api.items, 'list').mockResolvedValue(makePage([active], 1, 1, 1));
    await fireEvent.press(screen.getByTestId('catalog-error-retry'));

    await waitFor(() => expect(screen.queryByTestId('catalog-error')).toBeNull());
    expect(await screen.findByTestId('catalog-item-1')).toBeTruthy();
  });

  it('redirects non-administrators before loading catalog data', async () => {
    mockRoles(['CASHIER']);

    await render(<Catalog />);

    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href).toBe('/');
    expect(api.items.list).not.toHaveBeenCalled();
    expect(screen.queryByTestId('catalog-add-item')).toBeNull();
  });
});
