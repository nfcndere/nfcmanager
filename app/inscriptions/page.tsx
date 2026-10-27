import { AppShell } from '@/components/AppShell';
import { FormsManagement } from '@/components/FormsManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function InscriptionsPage() {
  const { user, apiUnavailable } = await requirePageSession('/inscriptions');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Académie, Contact & Billetterie"
      subtitle="Traitez les candidatures à l’Académie, contactez les candidats en 1 geste et exportez les listes CSV."
      apiUnavailable={apiUnavailable}
    >
      <FormsManagement canWrite={canWrite} />
    </AppShell>
  );
}
