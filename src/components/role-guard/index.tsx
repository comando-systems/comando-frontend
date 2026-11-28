import { Redirect, usePathname } from 'expo-router';
import type { ReactNode } from 'react';

import { useSession } from '@/providers/session-provider';
import type { UserResponse } from '@/types';
import { permissions } from '@/utils/permissions';

interface RoleGuardProps {
  readonly children: ReactNode;
}

type AccessRule = (user: UserResponse | null) => boolean;

const accessRules: readonly (readonly [string, AccessRule])[] = [
  ['/management', permissions.canManage],
  ['/counter', permissions.canUseCounter],
  ['/tables', permissions.canUseTables],
  ['/history', permissions.canViewHistory],
];

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function RoleGuard({ children }: RoleGuardProps) {
  const { user } = useSession();
  const pathname = usePathname();

  const restrictedRule = accessRules.find(([route]) => matchesRoute(pathname, route))?.[1];

  if (restrictedRule !== undefined && !restrictedRule(user)) {
    return <Redirect href="/" />;
  }

  if (user === null) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}
