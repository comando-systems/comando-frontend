import type { RoleCode, UserResponse } from '@/types';

export function hasRole(user: UserResponse | null, role: RoleCode): boolean {
  return user?.roles[role] === role;
}

export function hasAnyRole(user: UserResponse | null, roles: readonly RoleCode[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

// Each operational screen belongs to one role. A user with several roles sees the union.
export const permissions = {
  canManage: (user: UserResponse | null) => hasRole(user, 'ADMIN'),
  canUseCounter: (user: UserResponse | null) => hasRole(user, 'CASHIER'),
  canUseTables: (user: UserResponse | null) => hasRole(user, 'SERVER'),
  canOpenTables: (user: UserResponse | null) => hasRole(user, 'SERVER'),
  canEditTables: (user: UserResponse | null) => hasRole(user, 'SERVER'),
  canViewHistory: (user: UserResponse | null) => hasRole(user, 'ADMIN'),
  canCloseOrders: (user: UserResponse | null) => hasAnyRole(user, ['CASHIER', 'SERVER']),
  canCancelOrders: (user: UserResponse | null) => hasAnyRole(user, ['CASHIER', 'SERVER']),
} as const;
