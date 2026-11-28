import type { RoleCode, UserResponse } from '@/types';
import { hasAnyRole, hasRole, permissions } from '@/utils/permissions';
import { toRoleSet } from '@/utils/roles';

function createUser(roles: readonly RoleCode[]): UserResponse {
  return {
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    roles: toRoleSet(roles),
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('permissions', () => {
  it('treats roles as a union', () => {
    const user = createUser(['CASHIER', 'SERVER']);

    expect(hasRole(user, 'SERVER')).toBe(true);
    expect(hasAnyRole(user, ['ADMIN', 'CASHIER'])).toBe(true);
    expect(hasRole(null, 'SERVER')).toBe(false);
  });

  it('keeps management access for admins only', () => {
    expect(permissions.canManage(createUser(['ADMIN']))).toBe(true);
    expect(permissions.canManage(createUser(['CASHIER']))).toBe(false);
  });

  it('gives each operational screen to a single role', () => {
    expect(permissions.canUseCounter(createUser(['CASHIER']))).toBe(true);
    expect(permissions.canUseCounter(createUser(['ADMIN']))).toBe(false);
    expect(permissions.canUseTables(createUser(['SERVER']))).toBe(true);
    expect(permissions.canUseTables(createUser(['CASHIER']))).toBe(false);
    expect(permissions.canViewHistory(createUser(['ADMIN']))).toBe(true);
    expect(permissions.canViewHistory(createUser(['CASHIER']))).toBe(false);
    expect(permissions.canViewHistory(createUser(['SERVER']))).toBe(false);
  });

  it('allows cashiers and servers to close and cancel orders', () => {
    expect(permissions.canCloseOrders(createUser(['SERVER']))).toBe(true);
    expect(permissions.canCloseOrders(createUser(['CASHIER']))).toBe(true);
    expect(permissions.canCloseOrders(createUser(['ADMIN']))).toBe(false);
    expect(permissions.canCancelOrders(createUser(['SERVER']))).toBe(true);
    expect(permissions.canCancelOrders(createUser(['CASHIER']))).toBe(true);
    expect(permissions.canCancelOrders(createUser(['ADMIN']))).toBe(false);
  });

  it('gives table opening and editing to servers only', () => {
    expect(permissions.canOpenTables(createUser(['ADMIN']))).toBe(false);
    expect(permissions.canEditTables(createUser(['ADMIN']))).toBe(false);
    expect(permissions.canOpenTables(createUser(['CASHIER']))).toBe(false);
    expect(permissions.canEditTables(createUser(['CASHIER']))).toBe(false);
    expect(permissions.canOpenTables(createUser(['SERVER']))).toBe(true);
    expect(permissions.canEditTables(createUser(['SERVER']))).toBe(true);
  });
});
