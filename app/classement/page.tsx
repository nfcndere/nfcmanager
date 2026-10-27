import { AppShell } from '@/components/AppShell';
import { StandingManagement } from '@/components/StandingManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function StandingPage() {
  const { user, apiUnavailable } = await requirePageSession('/classement');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Classement & Saisons"
      subtitle="Mettez à jour la position du Ngaoundéré FC avec calcul automatique des points et de la différence de buts."
      apiUnavailable={apiUnavailable}
    >
      <StandingManagement canWrite={canWrite} />
    </AppShell>
  );
}
