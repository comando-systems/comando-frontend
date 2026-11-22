import type { RoleCode, UserResponse } from '@/types';

export function hasRole(user: UserResponse | null, role: RoleCode): boolean {
  return user?.roles.includes(role) ?? false;
}

export function hasAnyRole(user: UserResponse | null, roles: readonly RoleCode[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

export const permissions = {
  canManage: (user: UserResponse | null) => hasRole(user, 'ADMIN'),
  canUseCounter: (user: UserResponse | null) => hasAnyRole(user, ['ADMIN', 'CASHIER']),
  canUseTables: (user: UserResponse | null) => hasAnyRole(user, ['CASHIER', 'SERVER']),
  canOpenTables: (user: UserResponse | null) => hasAnyRole(user, ['CASHIER', 'SERVER']),
  canEditTables: (user: UserResponse | null) => hasAnyRole(user, ['CASHIER', 'SERVER']),
  canViewHistory: (user: UserResponse | null) => hasAnyRole(user, ['ADMIN', 'CASHIER']),
  canCloseOrders: (user: UserResponse | null) => hasAnyRole(user, ['ADMIN', 'CASHIER']),
  canCancelOrders: (user: UserResponse | null) =>
    hasAnyRole(user, ['ADMIN', 'CASHIER', 'SERVER']),
} as const;
