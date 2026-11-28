import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Redirect, useFocusEffect } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { api, ApiError } from '@/services/api';
import Reports from '@/screens/reports';
import type { PaymentMethod, RoleCode, SalesSummaryResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: jest.fn(),
}));

function makeSummary(
  byMethod: readonly { method: PaymentMethod; amountCents: number }[] = [
    { method: 'CASH', amountCents: 80000 },
    { method: 'PIX', amountCents: 43456 },
  ],
): SalesSummaryResponse {
  return {
    from: '2026-11-22T00:00:00.000Z',
    to: '2026-11-23T00:00:00.000Z',
    closedOrders: 20,
    revenueCents: 123456,
    averageTicketCents: 6173,
    canceledOrders: 2,
    openOrders: 3,
    byMethod,
  };
}

function mockRoles(roles: readonly RoleCode[]) {
  jest.mocked(useSession).mockReturnValue({
    user: {
      id: 'user-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: toRoleSet(roles),
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  } as unknown as ReturnType<typeof useSession>);
}

describe('<Reports />', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      useEffect(() => {
        effect();
      }, [effect]);
    });
    mockRoles(['ADMIN']);
    jest.spyOn(api.reports, 'summary').mockResolvedValue(makeSummary());
  });

  it('loads today in UTC by default with date-only fields and Portuguese summary labels', async () => {
    await render(<Reports />);

    expect(await screen.findByTestId('reports-summary')).toBeTruthy();

    const query = jest.mocked(api.reports.summary).mock.calls[0]?.[0];
    expect(query?.from).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    expect(query?.to).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    expect(Date.parse(query?.to ?? '') - Date.parse(query?.from ?? '')).toBe(86_400_000);
    expect(screen.getByTestId('reports-from').props.value).toBe(query?.from?.slice(0, 10));
    expect(screen.getByTestId('reports-to').props.value).toBe(query?.to?.slice(0, 10));

    expect(screen.getByTestId('reports-revenue-value').props.children).toBe('R$1,234.56');
    expect(screen.getByTestId('reports-average-value').props.children).toBe('R$61.73');
    expect(screen.getByText('Pedidos fechados')).toBeTruthy();
    expect(screen.getByText('Pedidos cancelados')).toBeTruthy();
    expect(screen.getByText('Pedidos abertos')).toBeTruthy();
    expect(screen.getByText('Dinheiro')).toBeTruthy();
    expect(screen.getByText('Pix')).toBeTruthy();
  });

  it('masks typed dates and sends an exclusive UTC midnight range', async () => {
    await render(<Reports />);
    await screen.findByTestId('reports-summary');

    await fireEvent.changeText(screen.getByTestId('reports-from'), '2026/11/0x1');
    await fireEvent.changeText(screen.getByTestId('reports-to'), '20261108');

    expect(screen.getByTestId('reports-from').props.value).toBe('2026-11-01');
    expect(screen.getByTestId('reports-to').props.value).toBe('2026-11-08');

    await fireEvent.press(screen.getByTestId('reports-apply'));

    await waitFor(() =>
      expect(api.reports.summary).toHaveBeenLastCalledWith({
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-08T00:00:00.000Z',
      }),
    );
  });

  it('blocks partial, inverted, and excessive ranges before requesting a new summary', async () => {
    await render(<Reports />);
    await screen.findByTestId('reports-summary');
    const initialCalls = jest.mocked(api.reports.summary).mock.calls.length;

    await fireEvent.changeText(screen.getByTestId('reports-from'), '2026-1');
    await fireEvent.press(screen.getByTestId('reports-apply'));
    expect(screen.getByText('Data inicial: Use o formato AAAA-MM-DD para as datas.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('reports-from'), '2030-01-01');
    await fireEvent.press(screen.getByTestId('reports-apply'));
    expect(screen.getByText('A data final deve ser posterior à data inicial.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('reports-from'), '2020-01-01');
    await fireEvent.changeText(screen.getByTestId('reports-to'), '2021-01-03');
    await fireEvent.press(screen.getByTestId('reports-apply'));
    expect(screen.getByText('O período não pode ultrapassar 366 dias.')).toBeTruthy();

    expect(api.reports.summary).toHaveBeenCalledTimes(initialCalls);
  });

  it('resets the range to today in UTC', async () => {
    await render(<Reports />);
    await screen.findByTestId('reports-summary');

    await fireEvent.changeText(screen.getByTestId('reports-from'), '2020-01-01');
    await fireEvent.press(screen.getByTestId('reports-today'));

    const query = jest.mocked(api.reports.summary).mock.calls.at(-1)?.[0];
    expect(query?.from).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    expect(query?.to).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    expect(screen.getByTestId('reports-from').props.value).toBe(query?.from?.slice(0, 10));
    expect(screen.getByTestId('reports-to').props.value).toBe(query?.to?.slice(0, 10));
  });

  it('shows a fixed Portuguese error with retry support', async () => {
    jest
      .spyOn(api.reports, 'summary')
      .mockRejectedValue(new ApiError({ status: 403, code: 'FORBIDDEN' }));

    await render(<Reports />);

    expect(await screen.findByText('Você não tem permissão para realizar esta ação.')).toBeTruthy();

    jest.spyOn(api.reports, 'summary').mockResolvedValue(makeSummary([]));
    await fireEvent.press(screen.getByTestId('reports-error-retry'));

    await waitFor(() => expect(screen.queryByTestId('reports-error')).toBeNull());
    expect(await screen.findByTestId('reports-no-payments')).toBeTruthy();
  });

  it('redirects non-administrators before loading reports', async () => {
    mockRoles(['CASHIER']);

    await render(<Reports />);

    expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0]?.href).toBe('/');
    expect(api.reports.summary).not.toHaveBeenCalled();
    expect(screen.queryByTestId('reports-summary')).toBeNull();
  });
});
