import { sessionStorage } from '@/services/storage';
import type {
  AddOrderItemsRequest,
  ChangeOrderItemQuantityRequest,
  CloseOrderRequest,
  CreateCounterOrderRequest,
  CreateItemRequest,
  CreateUserRequest,
  DateRangeParams,
  ErrorResponse,
  ItemListParams,
  ItemResponse,
  LoginRequest,
  OrderListParams,
  OpenTableOrderRequest,
  OrderResponse,
  PageResponse,
  PaginationParams,
  RefreshRequest,
  SalesSummaryResponse,
  SessionResponse,
  SetOrderPricingRequest,
  SettingsResponse,
  UpdateItemRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
  UserResponse,
} from '@/types';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: 'Please check the entered information.',
  UNAUTHORIZED: 'Authentication is required.',
  FORBIDDEN: 'You are not allowed to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'The request conflicts with the current state.',
  TABLE_OCCUPIED: 'This table is already occupied.',
  INVALID_VALUE: 'Please check the entered values.',
  INVARIANT_VIOLATION: 'This operation cannot be completed in the current state.',
  INVALID_STATE_TRANSITION: 'This operation cannot be completed in the current state.',
  PAYLOAD_TOO_LARGE: 'The request is too large.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is unavailable. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
  CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own account.',
  CANNOT_REMOVE_OWN_ADMIN: 'You cannot remove your own administrator role.',
  LAST_ADMIN: 'The last active administrator cannot be removed.',
  NETWORK_ERROR: 'The server could not be reached. Check your connection.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  CONFIG_ERROR: 'The API URL is not configured.',
};

export function getErrorMessage(code: string): string {
  return errorMessages[code] ?? 'The request could not be completed.';
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(input: {
    status: number;
    code: string;
    details?: unknown;
    requestId?: string;
    message?: string;
  }) {
    super(input.message ?? getErrorMessage(input.code));
    this.name = 'ApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
  }
}

type QueryValue = string | number | boolean | null | undefined | readonly string[];

interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  readonly query?: object;
  readonly skipAuth?: boolean;
  readonly skipRefresh?: boolean;
  readonly accessTokenOverride?: string;
}

function apiBaseUrl(): string {
  if (!configuredApiUrl) {
    throw new ApiError({ status: 0, code: 'CONFIG_ERROR' });
  }

  return configuredApiUrl.replace(/\/+$/, '');
}

function buildUrl(path: string, query?: object): string {
  const base = apiBaseUrl();

  if (!query) {
    return `${base}${path}`;
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, rawValue]) => {
    const value = rawValue as QueryValue;

    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString.length > 0 ? `${base}${path}?${queryString}` : `${base}${path}`;
}

function fallbackCode(status: number): string {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'CONFLICT';
}

async function readText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const raw = await readText(response);
  let body: unknown = null;

  if (raw.length > 0) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  const error =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body as ErrorResponse).error
      : undefined;

  return new ApiError({
    status: response.status,
    code: typeof error?.code === 'string' ? error.code : fallbackCode(response.status),
    details: error?.details,
    requestId: typeof error?.requestId === 'string' ? error.requestId : undefined,
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  const raw = await readText(response);

  if (raw.length === 0) {
    return undefined as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError({ status: response.status, code: 'INTERNAL_ERROR' });
  }
}

let refreshInFlight: Promise<SessionResponse | null> | null = null;

async function performRefresh(refreshToken: string): Promise<SessionResponse | null> {
  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken } satisfies RefreshRequest),
    });

    if (!response.ok) {
      await sessionStorage.clear();
      return null;
    }

    const session = await parseJson<SessionResponse>(response);
    await sessionStorage.save(session);
    return session;
  } catch {
    await sessionStorage.clear();
    return null;
  }
}

function refreshOnce(refreshToken: string): Promise<SessionResponse | null> {
  if (refreshInFlight === null) {
    refreshInFlight = performRefresh(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = options.skipAuth ? null : await sessionStorage.read();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const accessToken = options.accessTokenOverride ?? session?.accessToken;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  };

  if (options.body !== undefined) {
    config.body = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, options.query), config);
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR' });
  }

  if (response.status === 401 && !options.skipAuth && !options.skipRefresh) {
    if (!session?.refreshToken) {
      await sessionStorage.clear();
      throw new ApiError({ status: 401, code: 'SESSION_EXPIRED' });
    }

    const refreshed = await refreshOnce(session.refreshToken);

    if (refreshed === null) {
      throw new ApiError({ status: 401, code: 'SESSION_EXPIRED' });
    }

    return request<T>(path, {
      ...options,
      skipRefresh: true,
      accessTokenOverride: refreshed.accessToken,
    });
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJson<T>(response);
}

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

export const api = {
  auth: {
    login(body: LoginRequest): Promise<SessionResponse> {
      return request<SessionResponse>('/auth/login', {
        method: 'POST',
        body,
        skipAuth: true,
        skipRefresh: true,
      });
    },
    async logout(): Promise<void> {
      const session = await sessionStorage.read();

      if (session === null) {
        return;
      }

      await request<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken: session.refreshToken } satisfies RefreshRequest,
        skipAuth: true,
        skipRefresh: true,
      });
    },
  },
  users: {
    list(query: PaginationParams = {}): Promise<PageResponse<UserResponse>> {
      return request<PageResponse<UserResponse>>('/users', { query });
    },
    get(id: string): Promise<UserResponse> {
      return request<UserResponse>(`/users/${encodeId(id)}`);
    },
    create(body: CreateUserRequest): Promise<UserResponse> {
      return request<UserResponse>('/users', { method: 'POST', body });
    },
    update(id: string, body: UpdateUserRequest): Promise<UserResponse> {
      return request<UserResponse>(`/users/${encodeId(id)}`, { method: 'PATCH', body });
    },
    deactivate(id: string): Promise<UserResponse> {
      return request<UserResponse>(`/users/${encodeId(id)}`, { method: 'DELETE' });
    },
  },
  items: {
    list(query: ItemListParams = {}): Promise<PageResponse<ItemResponse>> {
      return request<PageResponse<ItemResponse>>('/items', { query });
    },
    get(id: string): Promise<ItemResponse> {
      return request<ItemResponse>(`/items/${encodeId(id)}`);
    },
    create(body: CreateItemRequest): Promise<ItemResponse> {
      return request<ItemResponse>('/items', { method: 'POST', body });
    },
    update(id: string, body: UpdateItemRequest): Promise<ItemResponse> {
      return request<ItemResponse>(`/items/${encodeId(id)}`, { method: 'PATCH', body });
    },
    remove(id: string): Promise<ItemResponse> {
      return request<ItemResponse>(`/items/${encodeId(id)}`, { method: 'DELETE' });
    },
  },
  orders: {
    createCounter(body: CreateCounterOrderRequest): Promise<OrderResponse> {
      return request<OrderResponse>('/orders/counter', { method: 'POST', body });
    },
    openTable(body: OpenTableOrderRequest): Promise<OrderResponse> {
      return request<OrderResponse>('/orders/table', { method: 'POST', body });
    },
    list(query: OrderListParams = {}): Promise<PageResponse<OrderResponse>> {
      return request<PageResponse<OrderResponse>>('/orders', { query });
    },
    get(id: string): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}`);
    },
    addItems(id: string, body: AddOrderItemsRequest): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/items`, { method: 'POST', body });
    },
    changeQuantity(
      id: string,
      itemId: string,
      body: ChangeOrderItemQuantityRequest,
    ): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/items/${encodeId(itemId)}`, {
        method: 'PATCH',
        body,
      });
    },
    removeItem(id: string, itemId: string): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/items/${encodeId(itemId)}`, {
        method: 'DELETE',
      });
    },
    setPricing(id: string, body: SetOrderPricingRequest): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/pricing`, { method: 'PATCH', body });
    },
    requestPayment(id: string): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/request-payment`, { method: 'POST' });
    },
    reopen(id: string): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/reopen`, { method: 'POST' });
    },
    close(id: string, body: CloseOrderRequest): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/close`, { method: 'POST', body });
    },
    cancel(id: string): Promise<OrderResponse> {
      return request<OrderResponse>(`/orders/${encodeId(id)}/cancel`, { method: 'POST' });
    },
  },
  settings: {
    get(): Promise<SettingsResponse> {
      return request<SettingsResponse>('/settings');
    },
    update(body: UpdateSettingsRequest): Promise<SettingsResponse> {
      return request<SettingsResponse>('/settings', { method: 'PUT', body });
    },
  },
  reports: {
    summary(query: DateRangeParams = {}): Promise<SalesSummaryResponse> {
      return request<SalesSummaryResponse>('/reports/summary', { query });
    },
  },
};
