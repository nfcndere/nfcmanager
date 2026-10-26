import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PlayerManagement } from '@/components/PlayerManagement';
import { getSession } from '@/lib/auth';
import { getSiteData } from '@/lib/site-api';

type PlayerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string | null;
  isCaptain: boolean;
};

export default async function SquadPage() {
  const user = await getSession();
  if (!user) redirect('/connexion');
  let players: PlayerRecord[] = [];
  let loadError: string | null = null;
  try {
    players = (await getSiteData<PlayerRecord[]>('players')).data;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Impossible de charger l’effectif.';
  }

  return (
    <AppShell user={user}>
      <h1 className="mb-2 text-3xl font-bold">Effectif</h1>
      <p className="mb-6 text-gray-600">Les postes et les champs respectent le contrat de données du site public.</p>
      {loadError && <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-900" role="alert">{loadError}</p>}
      <PlayerManagement players={players} canWrite={user.role === 'ADMIN' || user.role === 'EDITOR'} />
    </AppShell>
  );
}
