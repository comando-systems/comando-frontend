export type RoleCode = 'ADMIN' | 'CASHIER' | 'SERVER';
export type RoleSet = Readonly<Partial<Record<RoleCode, RoleCode>>>;
export type OrderType = 'COUNTER' | 'TABLE';
export type OrderStatus = 'OPEN' | 'AWAITING_PAYMENT' | 'CLOSED' | 'CANCELED';
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'OTHER';

export const ROLE_CODES: readonly RoleCode[] = ['ADMIN', 'CASHIER', 'SERVER'];
export const ORDER_TYPES: readonly OrderType[] = ['COUNTER', 'TABLE'];
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'OPEN',
  'AWAITING_PAYMENT',
  'CLOSED',
  'CANCELED',
];
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'PIX',
  'OTHER',
];

export interface BackendUserResponse {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly RoleCode[];
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type UserResponse = Omit<BackendUserResponse, 'roles'> & {
  readonly roles: RoleSet;
};

export interface ItemResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly priceCents: number;
  readonly imageUrl: string | null;
  readonly enabled: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrderItemResponse {
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
}

export interface OrderPaymentResponse {
  readonly method: PaymentMethod;
  readonly amountCents: number;
  readonly receivedCents: number | null;
  readonly changeCents: number | null;
}

export interface OrderResponse {
  readonly id: string;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly tableCode: string | null;
  readonly label: string | null;
  readonly openedByUserId: string;
  readonly closedByUserId: string | null;
  readonly canceledByUserId: string | null;
  readonly paymentRequestedByUserId: string | null;
  readonly paymentRequestedAt: string | null;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly canceledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly applyServiceFee: boolean;
  readonly serviceFeeBasisPoints: number;
  readonly subtotalCents: number;
  readonly surchargeCents: number;
  readonly discountCents: number;
  readonly serviceFeeCents: number;
  readonly totalCents: number;
  readonly items: readonly OrderItemResponse[];
  readonly payments: readonly OrderPaymentResponse[];
}

export interface SettingsResponse {
  readonly serviceFeeEnabled: boolean;
  readonly serviceFeeBasisPoints: number;
  readonly updatedAt: string;
}

export interface SalesSummaryResponse {
  readonly from: string;
  readonly to: string;
  readonly closedOrders: number;
  readonly revenueCents: number;
  readonly averageTicketCents: number;
  readonly canceledOrders: number;
  readonly openOrders: number;
  readonly byMethod: readonly {
    readonly method: PaymentMethod;
    readonly amountCents: number;
  }[];
}

export interface SessionResponse {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
  readonly user: UserResponse;
}

export type BackendSessionResponse = Omit<SessionResponse, 'user'> & {
  readonly user: BackendUserResponse;
};

export interface PageResponse<T> {
  readonly data: readonly T[];
  readonly pagination: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly requestId?: string;
  };
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RefreshRequest {
  readonly refreshToken: string;
}

export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly roles: readonly RoleCode[];
}

export interface UpdateUserRequest {
  readonly name?: string;
  readonly email?: string;
  readonly password?: string;
  readonly roles?: readonly RoleCode[];
  readonly isActive?: boolean;
}

export interface CreateItemRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly category?: string;
  readonly enabled?: boolean;
  readonly priceCents: number;
  readonly imageUrl?: string | null;
}

export interface UpdateItemRequest {
  readonly name?: string;
  readonly description?: string | null;
  readonly category?: string;
  readonly enabled?: boolean;
  readonly priceCents?: number;
  readonly imageUrl?: string | null;
}

export interface OrderLineInput {
  readonly itemId: string;
  readonly quantity: number;
}

export type OrderDraftLine = OrderLineInput;

export interface OrderDraft {
  readonly items: readonly OrderDraftLine[];
  readonly surchargeCents: number;
  readonly discountCents: number;
  readonly applyServiceFee: boolean;
}

export interface PaymentInput {
  readonly method: PaymentMethod;
  readonly amountCents: number;
  readonly receivedCents?: number;
}

export interface CreateCounterOrderRequest {
  readonly items: readonly OrderLineInput[];
  readonly payments?: readonly PaymentInput[];
  readonly label?: string | null;
  readonly surchargeCents?: number;
  readonly discountCents?: number;
  readonly applyServiceFee?: boolean;
}

export interface OpenTableOrderRequest {
  readonly tableCode: string;
}

export interface AddOrderItemsRequest {
  readonly items: readonly OrderLineInput[];
}

export interface ChangeOrderItemQuantityRequest {
  readonly quantity: number;
}

export interface SetOrderPricingRequest {
  readonly surchargeCents?: number | null;
  readonly discountCents?: number | null;
  readonly applyServiceFee?: boolean;
}

export interface CloseOrderRequest {
  readonly payments?: readonly PaymentInput[];
}

export interface UpdateSettingsRequest {
  readonly serviceFeeEnabled?: boolean;
  readonly serviceFeeBasisPoints?: number;
}

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ItemListParams extends PaginationParams {
  readonly includeRemoved?: boolean;
}

export interface OrderListParams extends PaginationParams {
  readonly status?: OrderStatus;
  readonly statuses?: OrderStatus[];
  readonly type?: OrderType;
  readonly tableCode?: string;
  readonly from?: string;
  readonly to?: string;
}

export interface DateRangeParams {
  readonly from?: string;
  readonly to?: string;
}

export interface TableOccupiedDetails {
  readonly orderId: string;
}
