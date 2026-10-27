import { AppShell } from '@/components/AppShell';
import { PlayerManagement } from '@/components/PlayerManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function SquadPage() {
  const { user, apiUnavailable } = await requirePageSession('/effectif');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Effectif Professionnel"
      subtitle="Gérez les joueurs, numéros, photos officielles, biographies et statistiques de saison."
      apiUnavailable={apiUnavailable}
    >
      <PlayerManagement canWrite={canWrite} />
    </AppShell>
  );
}
