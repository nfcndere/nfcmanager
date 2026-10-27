import { AppShell } from '@/components/AppShell';
import { PartnerManagement } from '@/components/PartnerManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const { user, apiUnavailable } = await requirePageSession('/partenaires');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Sponsors & Partenaires"
      subtitle="Gérez les logos, liens et ordres d’affichage des partenaires officiels du club."
      apiUnavailable={apiUnavailable}
    >
      <PartnerManagement canWrite={canWrite} />
    </AppShell>
  );
}
