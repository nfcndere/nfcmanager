import { AppShell } from '@/components/AppShell';
import { MatchManagement } from '@/components/MatchManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const { user, apiUnavailable } = await requirePageSession('/matchs');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Calendrier & Matchs en direct"
      subtitle="Programmez les rencontres et pilotez les scores en direct depuis le bord du terrain."
      apiUnavailable={apiUnavailable}
    >
      <MatchManagement canWrite={canWrite} />
    </AppShell>
  );
}
