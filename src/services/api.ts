import { sessionStorage } from '@/services/storage';
import type {
  AddOrderItemsRequest,
  BackendSessionResponse,
  BackendUserResponse,
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
import { toRoleSet } from '@/utils/roles';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: 'Verifique as informações informadas.',
  UNAUTHORIZED: 'É necessário entrar com sua conta.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'O recurso solicitado não foi encontrado.',
  CONFLICT: 'A solicitação conflita com o estado atual.',
  TABLE_OCCUPIED: 'Esta mesa já está ocupada.',
  INVALID_VALUE: 'Verifique os valores informados.',
  INVARIANT_VIOLATION: 'Esta operação não pode ser concluída no estado atual.',
  INVALID_STATE_TRANSITION: 'Esta operação não pode ser concluída no estado atual.',
  PAYLOAD_TOO_LARGE: 'A solicitação é muito grande.',
  TOO_MANY_REQUESTS: 'Muitas tentativas. Tente novamente mais tarde.',
  SERVICE_UNAVAILABLE: 'O serviço está indisponível. Tente novamente mais tarde.',
  INTERNAL_ERROR: 'Algo deu errado. Tente novamente.',
  CANNOT_DEACTIVATE_SELF: 'Você não pode desativar sua própria conta.',
  CANNOT_REMOVE_OWN_ADMIN: 'Você não pode remover seu próprio perfil de administrador.',
  LAST_ADMIN: 'O último administrador ativo não pode ser removido.',
  NETWORK_ERROR: 'Não foi possível contatar o servidor. Verifique sua conexão.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente.',
  CONFIG_ERROR: 'A URL da API não está configurada.',
};

export function getErrorMessage(code: string): string {
  return errorMessages[code] ?? 'A solicitação não pôde ser concluída.';
}

function toUserResponse(user: BackendUserResponse): UserResponse {
  return { ...user, roles: toRoleSet(user.roles) };
}

function toSessionResponse(session: BackendSessionResponse): SessionResponse {
  return { ...session, user: toUserResponse(session.user) };
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

    const backendSession = await parseJson<BackendSessionResponse>(response);
    const session = toSessionResponse(backendSession);
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

export interface HttpRequestInput {
  readonly path: string;
  readonly body?: unknown;
  readonly query?: object;
  readonly skipAuth?: boolean;
  readonly skipRefresh?: boolean;
  readonly accessTokenOverride?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

function call<T>(method: HttpMethod, params: HttpRequestInput): Promise<T> {
  return request<T>(params.path, {
    method,
    body: params.body,
    query: params.query,
    skipAuth: params.skipAuth,
    skipRefresh: params.skipRefresh,
    accessTokenOverride: params.accessTokenOverride,
  });
}

export const http = {
  get: <T>(params: HttpRequestInput): Promise<T> => call<T>('GET', params),
  post: <T>(params: HttpRequestInput): Promise<T> => call<T>('POST', params),
  patch: <T>(params: HttpRequestInput): Promise<T> => call<T>('PATCH', params),
  put: <T>(params: HttpRequestInput): Promise<T> => call<T>('PUT', params),
  delete: <T>(params: HttpRequestInput): Promise<T> => call<T>('DELETE', params),
} as const;

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

export const api = {
  auth: {
    async login(body: LoginRequest): Promise<SessionResponse> {
      const session = await http.post<BackendSessionResponse>({
        path: '/auth/login',
        body,
        skipAuth: true,
        skipRefresh: true,
      });
      return toSessionResponse(session);
    },
    async logout(): Promise<void> {
      const session = await sessionStorage.read();

      if (session === null) {
        return;
      }

      await http.post<void>({
        path: '/auth/logout',
        body: { refreshToken: session.refreshToken } satisfies RefreshRequest,
        skipAuth: true,
        skipRefresh: true,
      });
    },
  },
  users: {
    async list(query: PaginationParams = {}): Promise<PageResponse<UserResponse>> {
      const page = await http.get<PageResponse<BackendUserResponse>>({ path: '/users', query });
      return { ...page, data: page.data.map(toUserResponse) };
    },
    async get(id: string): Promise<UserResponse> {
      const user = await http.get<BackendUserResponse>({ path: `/users/${encodeId(id)}` });
      return toUserResponse(user);
    },
    async create(body: CreateUserRequest): Promise<UserResponse> {
      const user = await http.post<BackendUserResponse>({ path: '/users', body });
      return toUserResponse(user);
    },
    async update(id: string, body: UpdateUserRequest): Promise<UserResponse> {
      const user = await http.patch<BackendUserResponse>({
        path: `/users/${encodeId(id)}`,
        body,
      });
      return toUserResponse(user);
    },
    async deactivate(id: string): Promise<UserResponse> {
      const user = await http.delete<BackendUserResponse>({ path: `/users/${encodeId(id)}` });
      return toUserResponse(user);
    },
  },
  items: {
    list(query: ItemListParams = {}): Promise<PageResponse<ItemResponse>> {
      return http.get<PageResponse<ItemResponse>>({ path: '/items', query });
    },
    get(id: string): Promise<ItemResponse> {
      return http.get<ItemResponse>({ path: `/items/${encodeId(id)}` });
    },
    create(body: CreateItemRequest): Promise<ItemResponse> {
      return http.post<ItemResponse>({ path: '/items', body });
    },
    update(id: string, body: UpdateItemRequest): Promise<ItemResponse> {
      return http.patch<ItemResponse>({ path: `/items/${encodeId(id)}`, body });
    },
    remove(id: string): Promise<ItemResponse> {
      return http.delete<ItemResponse>({ path: `/items/${encodeId(id)}` });
    },
  },
  orders: {
    createCounter(body: CreateCounterOrderRequest): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: '/orders/counter', body });
    },
    openTable(body: OpenTableOrderRequest): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: '/orders/table', body });
    },
    list(query: OrderListParams = {}): Promise<PageResponse<OrderResponse>> {
      return http.get<PageResponse<OrderResponse>>({ path: '/orders', query });
    },
    get(id: string): Promise<OrderResponse> {
      return http.get<OrderResponse>({ path: `/orders/${encodeId(id)}` });
    },
    addItems(id: string, body: AddOrderItemsRequest): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: `/orders/${encodeId(id)}/items`, body });
    },
    changeQuantity(
      id: string,
      itemId: string,
      body: ChangeOrderItemQuantityRequest,
    ): Promise<OrderResponse> {
      return http.patch<OrderResponse>({
        path: `/orders/${encodeId(id)}/items/${encodeId(itemId)}`,
        body,
      });
    },
    removeItem(id: string, itemId: string): Promise<OrderResponse> {
      return http.delete<OrderResponse>({
        path: `/orders/${encodeId(id)}/items/${encodeId(itemId)}`,
      });
    },
    setPricing(id: string, body: SetOrderPricingRequest): Promise<OrderResponse> {
      return http.patch<OrderResponse>({ path: `/orders/${encodeId(id)}/pricing`, body });
    },
    requestPayment(id: string): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: `/orders/${encodeId(id)}/request-payment` });
    },
    reopen(id: string): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: `/orders/${encodeId(id)}/reopen` });
    },
    close(id: string, body: CloseOrderRequest): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: `/orders/${encodeId(id)}/close`, body });
    },
    cancel(id: string): Promise<OrderResponse> {
      return http.post<OrderResponse>({ path: `/orders/${encodeId(id)}/cancel` });
    },
  },
  settings: {
    get(): Promise<SettingsResponse> {
      return http.get<SettingsResponse>({ path: '/settings' });
    },
    update(body: UpdateSettingsRequest): Promise<SettingsResponse> {
      return http.put<SettingsResponse>({ path: '/settings', body });
    },
  },
  reports: {
    summary(query: DateRangeParams = {}): Promise<SalesSummaryResponse> {
      return http.get<SalesSummaryResponse>({ path: '/reports/summary', query });
    },
  },
};
