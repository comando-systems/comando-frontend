import type { RoleCode } from '@/types';
import { isRoleSet, roleSetToArray, toRoleSet } from '@/utils/roles';

describe('role sets', () => {
  it('maps role arrays to a lookup record', () => {
    expect(toRoleSet(['CASHIER', 'SERVER'])).toEqual({
      CASHIER: 'CASHIER',
      SERVER: 'SERVER',
    });
  });

  it('returns roles in a stable order', () => {
    expect(roleSetToArray(toRoleSet(['SERVER', 'CASHIER']))).toEqual(['CASHIER', 'SERVER']);
  });

  it('rejects invalid persisted role records', () => {
    expect(isRoleSet({ ADMIN: 'ADMIN' })).toBe(true);
    expect(isRoleSet({ ADMIN: 'CASHIER' })).toBe(false);
    expect(isRoleSet({ UNKNOWN: 'UNKNOWN' })).toBe(false);
    expect(isRoleSet(['ADMIN'])).toBe(false);
  });

  it('treats a missing role as absent', () => {
    const roles = toRoleSet(['CASHIER']);

    expect(roles.ADMIN).toBeUndefined();
    expect(roles.CASHIER).toBe('CASHIER' satisfies RoleCode);
  });
});
