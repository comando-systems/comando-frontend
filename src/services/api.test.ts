import { ApiError, api, http, type HttpRequestInput } from '@/services/api';
import { sessionStorage } from '@/services/storage';
import type { BackendSessionResponse, OrderResponse, SessionResponse } from '@/types';
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
    roles: ['CASHIER'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

const session: SessionResponse = {
  ...backendSession,
  user: {
    ...backendSession.user,
    roles: toRoleSet(backendSession.user.roles),
  },
};

const backendRotatedSession: BackendSessionResponse = {
  ...backendSession,
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
};

const rotatedSession: SessionResponse = {
  ...backendRotatedSession,
  user: {
    ...backendRotatedSession.user,
    roles: toRoleSet(backendRotatedSession.user.roles),
  },
};

const order: OrderResponse = {
  id: '10',
  type: 'TABLE',
  status: 'OPEN',
  tableCode: 'T-01',
  label: null,
  openedByUserId: '1',
  closedByUserId: null,
  canceledByUserId: null,
  paymentRequestedByUserId: null,
  paymentRequestedAt: null,
  openedAt: '2026-11-22T19:00:00.000Z',
  closedAt: null,
  canceledAt: null,
  createdAt: '2026-11-22T19:00:00.000Z',
  updatedAt: '2026-11-22T19:00:00.000Z',
  version: 1,
  applyServiceFee: false,
  serviceFeeBasisPoints: 1000,
  subtotalCents: 1500,
  surchargeCents: 0,
  discountCents: 0,
  serviceFeeCents: 0,
  totalCents: 1500,
  items: [],
  payments: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function errorResponse(code: string, status: number, details?: unknown): Response {
  return jsonResponse(
    {
      error: {
        code,
        message: 'Backend detail that must not appear.',
        ...(details === undefined ? {} : { details }),
        requestId: 'request-1',
      },
    },
    status,
  );
}

describe('API client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('logs in without attaching a bearer token', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonResponse(backendSession));

    await expect(api.auth.login({ email: 'ada@example.com', password: 'secret123' })).resolves.toEqual(
      session,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ada@example.com', password: 'secret123' }),
      }),
    );
  });

  it('maps backend user role arrays to lookup records', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [backendSession.user],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
    );

    const page = await api.users.list();

    expect(page.data[0]?.roles).toEqual({ CASHIER: 'CASHIER' });
  });

  it.each([
    ['get', 'GET', (input: HttpRequestInput) => http.get(input)],
    ['post', 'POST', (input: HttpRequestInput) => http.post(input)],
    ['patch', 'PATCH', (input: HttpRequestInput) => http.patch(input)],
    ['put', 'PUT', (input: HttpRequestInput) => http.put(input)],
    ['delete', 'DELETE', (input: HttpRequestInput) => http.delete(input)],
  ] as const)('http.%s forwards method and request options', async (_name, method, execute) => {
    jest.mocked(sessionStorage.read).mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await execute({
      path: '/probe',
      body: { value: 1 },
      query: { page: 2 },
      skipAuth: true,
      skipRefresh: true,
      accessTokenOverride: 'override',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/probe?page=2`,
      expect.objectContaining({
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer override' },
        body: JSON.stringify({ value: 1 }),
      }),
    );
  });

  it('attaches the bearer token and serializes query parameters', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [], pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 } }),
    );

    await api.items.list({ includeRemoved: true, page: 2, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/items?includeRemoved=true&page=2&pageSize=10`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer access-1' },
      }),
    );
  });

  it('refreshes once, stores the rotated session, and retries the request', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    fetchMock
      .mockResolvedValueOnce(errorResponse('UNAUTHORIZED', 401))
      .mockResolvedValueOnce(jsonResponse(backendRotatedSession))
      .mockResolvedValueOnce(jsonResponse(order));

    await expect(api.orders.get('10')).resolves.toEqual(order);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/auth/refresh`);
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ refreshToken: 'refresh-1' }));
    expect(sessionStorage.save).toHaveBeenCalledWith(rotatedSession);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer access-2');
  });

  it('shares a single refresh when concurrent requests receive 401', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    let refreshCount = 0;
    const orderRequests = new Map<string, number>();

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        refreshCount += 1;
        return jsonResponse(backendRotatedSession);
      }

      const count = orderRequests.get(url) ?? 0;
      orderRequests.set(url, count + 1);
      return count === 0 ? errorResponse('UNAUTHORIZED', 401) : jsonResponse(order);
    });

    await Promise.all([api.orders.get('10'), api.orders.get('11')]);

    expect(refreshCount).toBe(1);
    expect(sessionStorage.save).toHaveBeenCalledTimes(1);
  });

  it('clears the session and throws an expired-session error when refresh fails', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    fetchMock
      .mockResolvedValueOnce(errorResponse('UNAUTHORIZED', 401))
      .mockResolvedValueOnce(errorResponse('UNAUTHORIZED', 401));

    await expect(api.orders.get('10')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
      message: 'Sua sessão expirou. Entre novamente.',
    });
    expect(sessionStorage.clear).toHaveBeenCalled();
  });

  it('normalizes backend errors into fixed English messages and preserves details', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    fetchMock.mockResolvedValue(errorResponse('TABLE_OCCUPIED', 409, { orderId: '77' }));

    try {
      await api.orders.openTable({ tableCode: 'T-01' });
      throw new Error('Expected the request to fail');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.code).toBe('TABLE_OCCUPIED');
      expect(apiError.message).toBe('Esta mesa já está ocupada.');
      expect(apiError.details).toEqual({ orderId: '77' });
      expect(apiError.requestId).toBe('request-1');
      expect(apiError.message).not.toContain('Backend detail');
    }
  });

  it('uses a generic English message for unknown backend codes', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(session);
    fetchMock.mockResolvedValue(errorResponse('NEW_BACKEND_CODE', 400));

    await expect(api.settings.get()).rejects.toMatchObject({
      code: 'NEW_BACKEND_CODE',
      message: 'A solicitação não pôde ser concluída.',
    });
  });

  it('normalizes network failures', async () => {
    jest.mocked(sessionStorage.read).mockResolvedValue(null);
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(api.auth.login({ email: 'a@b.co', password: 'secret123' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Não foi possível contatar o servidor. Verifique sua conexão.',
    });
  });
});
