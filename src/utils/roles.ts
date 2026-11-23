import { ROLE_CODES, type RoleCode, type RoleSet } from '@/types';

export function toRoleSet(roles: readonly RoleCode[]): RoleSet {
  const result: Partial<Record<RoleCode, RoleCode>> = {};

  roles.forEach((role) => {
    result[role] = role;
  });

  return result;
}

export function roleSetToArray(roles: RoleSet): readonly RoleCode[] {
  return ROLE_CODES.filter((role) => roles[role] === role);
}

export function isRoleSet(value: unknown): value is RoleSet {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([role, mapped]) => ROLE_CODES.includes(role as RoleCode) && mapped === role,
  );
}
