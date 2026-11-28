import { ApiError, api, getErrorMessage, http, request } from '@/services/api';
import { sessionStorage } from '@/services/storage';
import type { BackendSessionResponse } from '@/types';
import { toRoleSet } from '@/utils/roles';

jest.mock('@/services/storage', () => ({
  sessionStorage: {
    read: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
  },
  subscribeToSession: jest.fn(),
}));

const API_URL = 'https://api.example.test';

const backendSession: BackendSessionResponse = {
  accessToken: 'access-1',
  expiresAt: '2026-11-22T20:00:00.000Z',
  refreshToken: 'refresh-1',
  refreshExpiresAt: '2026-12-22T20:00:00.000Z',
  user: {
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    roles: ['ADMIN'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function rawResponse(raw: string, status: number): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => raw } as Response;
}

function lastCall(): [string, RequestInit] {
  const fetchMock = jest.mocked(globalThis.fetch);
  const call = fetchMock.mock.calls.at(-1);

  if (call === undefined) {
    throw new Error('No fetch call was made');
  }

  return [String(call[0]), call[1] as RequestInit];
}

describe('API endpoint definitions', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    jest.mocked(sessionStorage.read).mockResolvedValue(null);
  });

  it('covers every user endpoint and maps backend roles', async () => {
    const page = {
      data: [backendSession.user],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    fetchMock.mockResolvedValue(jsonResponse(page));

    await expect(api.users.list({ page: 1 })).resolves.toMatchObject({
      data: [{ roles: { ADMIN: 'ADMIN' } }],
    });
    expect(lastCall()[0]).toBe(`${API_URL}/users?page=1`);

    fetchMock.mockResolvedValue(jsonResponse(backendSession.user));
    await expect(api.users.get('7')).resolves.toMatchObject({ roles: toRoleSet(['ADMIN']) });
    expect(lastCall()[0]).toBe(`${API_URL}/users/7`);

    const body = { name: 'Grace', email: 'grace@example.com', password: 'secret123', roles: ['SERVER'] as const };
    await expect(api.users.create({ ...body, roles: [...body.roles] })).resolves.toMatchObject({
      roles: { ADMIN: 'ADMIN' },
    });
    expect(lastCall()[1]).toMatchObject({ method: 'POST', body: JSON.stringify(body) });

    await expect(api.users.update('7', { isActive: true })).resolves.toBeDefined();
    expect(lastCall()[1]).toMatchObject({ method: 'PATCH', body: '{"isActive":true}' });

    await expect(api.users.deactivate('7')).resolves.toBeDefined();
    expect(lastCall()[1]).toMatchObject({ method: 'DELETE' });
  });

  it('covers every item endpoint and forwards the search query', async () => {
    await api.items.list({ includeRemoved: true, page: 2, search: 'espresso' });
    expect(lastCall()[0]).toBe(
      `${API_URL}/items?includeRemoved=true&page=2&search=espresso`,
    );

    await api.items.get('3');
    expect(lastCall()[0]).toBe(`${API_URL}/items/3`);
    expect(lastCall()[1].method).toBe('GET');

    await api.items.create({ name: 'Coffee', priceCents: 500, categories: ['Drinks'] });
    expect(lastCall()[1]).toMatchObject({
      method: 'POST',
      body: '{"name":"Coffee","priceCents":500,"categories":["Drinks"]}',
    });

    await api.items.update('3', { categories: ['Drinks', 'Vegan'] });
    expect(lastCall()[1]).toMatchObject({
      method: 'PATCH',
      body: '{"categories":["Drinks","Vegan"]}',
    });

    await api.items.remove('3');
    expect(lastCall()[1]).toMatchObject({ method: 'DELETE' });
  });

  it('covers every order endpoint and serializes status arrays', async () => {
    await api.orders.createCounter({ items: [{ itemId: '1', quantity: 1 }] });
    expect(lastCall()[0]).toBe(`${API_URL}/orders/counter`);
    expect(lastCall()[1].method).toBe('POST');

    await api.orders.openTable({ tableCode: 'T-01' });
    expect(lastCall()[0]).toBe(`${API_URL}/orders/table`);
    expect(lastCall()[1].body).toBe('{"tableCode":"T-01"}');

    await api.orders.list({ statuses: ['OPEN', 'CLOSED'], type: 'TABLE' });
    expect(lastCall()[0]).toBe(`${API_URL}/orders?statuses=OPEN%2CCLOSED&type=TABLE`);

    await api.orders.get('10');
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10`);

    await api.orders.addItems('10', { items: [{ itemId: '1', quantity: 2 }] });
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/items`);

    await api.orders.changeQuantity('10', '1', { quantity: 3 });
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/items/1`);
    expect(lastCall()[1].method).toBe('PATCH');

    await api.orders.removeItem('10', '1');
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/items/1`);
    expect(lastCall()[1].method).toBe('DELETE');

    await api.orders.setPricing('10', { discountCents: null });
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/pricing`);

    await api.orders.requestPayment('10');
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/request-payment`);

    await api.orders.reopen('10');
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/reopen`);

    await api.orders.close('10', { payments: [] });
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/close`);

    await api.orders.cancel('10');
    expect(lastCall()[0]).toBe(`${API_URL}/orders/10/cancel`);
  });

  it('covers settings, reports, and bodyless logout', async () => {
    await api.settings.get();
    expect(lastCall()[0]).toBe(`${API_URL}/settings`);

    await api.settings.update({ serviceFeeEnabled: true, serviceFeeBasisPoints: 1500 });
    expect(lastCall()[1]).toMatchObject({
      method: 'PUT',
      body: '{"serviceFeeEnabled":true,"serviceFeeBasisPoints":1500}',
    });

    await api.reports.summary({ from: '2026-01-01T00:00:00.000Z' });
    expect(lastCall()[0]).toBe(
      `${API_URL}/reports/summary?from=2026-01-01T00%3A00%3A00.000Z`,
    );

    await expect(api.auth.logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    jest.mocked(sessionStorage.read).mockResolvedValue({
      ...backendSession,
      user: { ...backendSession.user, roles: toRoleSet(backendSession.user.roles) },
    });
    fetchMock.mockResolvedValue({ ok: true, status: 204, text: async () => '' } as Response);
    await expect(api.auth.logout()).resolves.toBeUndefined();
    expect(lastCall()[1].body).toBe('{"refreshToken":"refresh-1"}');
  });

  it('handles 204, empty bodies, and array query values without a session', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, text: async () => '' } as Response);
    await expect(request('/empty', { skipAuth: true })).resolves.toBeUndefined();

    fetchMock.mockResolvedValue(rawResponse('', 200));
    await expect(http.get({ path: '/empty', skipAuth: true })).resolves.toBeUndefined();

    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.get({
      path: '/probe',
      query: { statuses: [], includeRemoved: null, page: undefined, type: 'TABLE' },
      skipAuth: true,
    });
    expect(lastCall()[0]).toBe(`${API_URL}/probe?type=TABLE`);
  });

  it('normalizes error fallbacks, malformed JSON, and refresh failures', async () => {
    const statuses = [
      [400, 'VALIDATION_ERROR'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [413, 'PAYLOAD_TOO_LARGE'],
      [429, 'TOO_MANY_REQUESTS'],
      [500, 'INTERNAL_ERROR'],
      [409, 'CONFLICT'],
    ] as const;

    for (const [status, code] of statuses) {
      fetchMock.mockResolvedValueOnce(rawResponse('plain text failure', status));
      await expect(api.settings.get()).rejects.toMatchObject({ code, status });
      expect(getErrorMessage(code)).toBeTruthy();
    }

    fetchMock.mockResolvedValueOnce(rawResponse('plain text failure', 401));
    await expect(request('/probe', { skipAuth: true })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: true }, 403));
    await expect(api.settings.get()).rejects.toMatchObject({ code: 'FORBIDDEN' });

    fetchMock.mockResolvedValueOnce(rawResponse('{invalid', 200));
    await expect(api.settings.get()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });

    jest.mocked(sessionStorage.read).mockResolvedValue({
      ...backendSession,
      user: { ...backendSession.user, roles: toRoleSet(backendSession.user.roles) },
    });
    fetchMock.mockResolvedValueOnce(rawResponse('', 401));
    await expect(api.orders.get('10')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(sessionStorage.clear).toHaveBeenCalledTimes(1);

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(api.orders.get('10')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    fetchMock
      .mockResolvedValueOnce(rawResponse('', 401))
      .mockRejectedValueOnce(new Error('offline'));
    await expect(api.orders.get('10')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(sessionStorage.clear).toHaveBeenCalledTimes(2);
  });

  it('exposes the fixed English messages and custom error messages', () => {
    expect(getErrorMessage('UNKNOWN')).toBe('A solicitação não pôde ser concluída.');
    expect(getErrorMessage('LAST_ADMIN')).toBe('O último administrador ativo não pode ser removido.');
    expect(new ApiError({ status: 400, code: 'VALIDATION_ERROR', message: 'Custom' }).message).toBe(
      'Custom',
    );
  });
});
