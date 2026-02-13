import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { assertCreatorIsActive } from '@/lib/onboardingStateMachine';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const creatorId = cookieStore.get('sanctum_creator_id')?.value;

  if (!creatorId) {
    redirect('/blocked');
  }

  try {
    assertCreatorIsActive(creatorId);
  } catch {
    redirect('/blocked');
  }

  return <>{children}</>;
}
