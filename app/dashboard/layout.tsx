import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { appRoutes } from '@/lib/routes';
import { assertCreatorIsActive } from '@/lib/onboardingStateMachine';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const creatorId = cookieStore.get('sanctum_creator_id')?.value;

  if (!creatorId) {
    redirect(appRoutes.blocked());
  }

  try {
    assertCreatorIsActive(creatorId);
  } catch {
    redirect(appRoutes.blocked());
  }

  return <>{children}</>;
}
