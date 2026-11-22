import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';
import { permissions } from '@/utils/permissions';

export default function Home() {
  const { user } = useSession();

  if (permissions.canUseTables(user)) {
    return <Redirect href="/tables" />;
  }

  if (permissions.canUseCounter(user)) {
    return <Redirect href="/counter" />;
  }

  return <Redirect href="/management" />;
}
