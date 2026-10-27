import { AppShell } from '@/components/AppShell';
import { DashboardView } from '@/components/DashboardView';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user, apiUnavailable } = await requirePageSession('/dashboard');

  return (
    <AppShell
      user={user}
      title="Tableau de bord"
      subtitle="Vue d’ensemble opérationnelle du Ngaoundéré FC (fuseau Africa/Douala)."
      apiUnavailable={apiUnavailable}
    >
      <DashboardView />
    </AppShell>
  );
}
