import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { MatchManagement } from '@/components/MatchManagement';
import { getSession } from '@/lib/auth';
import { getSiteData } from '@/lib/site-api';

type MatchRecord = {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string | null;
  competition: string | null;
  status: string;
  summary: string | null;
};

export default async function MatchesPage() {
  const user = await getSession();
  if (!user) redirect('/connexion');
  let matches: MatchRecord[] = [];
  let loadError: string | null = null;
  try {
    matches = (await getSiteData<MatchRecord[]>('matches?page=1&pageSize=100')).data;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Impossible de charger les matchs.';
  }

  return (
    <AppShell user={user}>
      <h1 className="mb-2 text-3xl font-bold">Matchs</h1>
      <p className="mb-6 text-gray-600">Saisissez les scores en direct; les modifications sont enregistrées immédiatement.</p>
      {loadError && <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-900" role="alert">{loadError}</p>}
      <MatchManagement matches={matches} canWrite={user.role === 'ADMIN' || user.role === 'EDITOR'} />
    </AppShell>
  );
}
