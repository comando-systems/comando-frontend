import { fireEvent, render, screen } from '@testing-library/react-native';

import { Pagination } from '@/components/pagination';
import { colors } from '@/theme';

describe('<Pagination />', () => {
  it('renders numbered buttons and highlights the current page', async () => {
    await render(<Pagination page={2} totalPages={3} onPageChange={jest.fn()} />);

    expect(screen.getByTestId('pagination-page-1')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-2').props.accessibilityLabel).toBe(
      'Página 2, página atual',
    );
    expect(screen.getByTestId('pagination-page-2').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('pagination-page-2').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: colors.primary })]),
    );
    expect(screen.getByTestId('pagination-page-3').props.accessibilityLabel).toBe(
      'Ir para a página 3',
    );
    expect(screen.getByTestId('pagination-page-3').props.accessibilityState.selected).toBe(false);
    expect(screen.queryByText('Anterior')).toBeNull();
    expect(screen.queryByText('Próxima')).toBeNull();
  });

  it('reports the chosen page', async () => {
    const onPageChange = jest.fn();
    await render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);

    await fireEvent.press(screen.getByTestId('pagination-page-3'));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('uses a trailing ellipsis near the first page', async () => {
    await render(<Pagination page={1} totalPages={10} onPageChange={jest.fn()} />);

    expect(screen.getByTestId('pagination-page-5')).toBeTruthy();
    expect(screen.getByTestId('pagination-ellipsis-5')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-10')).toBeTruthy();
    expect(screen.queryByTestId('pagination-page-6')).toBeNull();
  });

  it('uses a leading ellipsis near the last page', async () => {
    await render(<Pagination page={10} totalPages={10} onPageChange={jest.fn()} />);

    expect(screen.getByTestId('pagination-page-1')).toBeTruthy();
    expect(screen.getByTestId('pagination-ellipsis-1')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-6')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-10')).toBeTruthy();
    expect(screen.queryByTestId('pagination-page-5')).toBeNull();
  });

  it('keeps a window around the current page with ellipses on both sides', async () => {
    await render(<Pagination page={5} totalPages={12} onPageChange={jest.fn()} />);

    expect(screen.getByTestId('pagination-page-1')).toBeTruthy();
    expect(screen.getByTestId('pagination-ellipsis-1')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-4')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-5').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('pagination-page-6')).toBeTruthy();
    expect(screen.getByTestId('pagination-ellipsis-5')).toBeTruthy();
    expect(screen.getByTestId('pagination-page-12')).toBeTruthy();
    expect(screen.queryByTestId('pagination-page-7')).toBeNull();
  });

  it('shows a single page for empty or out-of-range input', async () => {
    await render(<Pagination page={0} totalPages={0} onPageChange={jest.fn()} />);

    expect(screen.getByTestId('pagination-page-1').props.accessibilityState.selected).toBe(true);
    expect(screen.queryByTestId('pagination-page-2')).toBeNull();
  });

  it('clamps an out-of-range current page to the last page', async () => {
    await render(<Pagination page={99} totalPages={4} onPageChange={jest.fn()} />);

    expect(screen.getByTestId('pagination-page-4').props.accessibilityState.selected).toBe(true);
  });
});
