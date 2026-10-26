import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getSession } from '@/lib/auth';
import { getSiteData } from '@/lib/site-api';

type StandingResponse = {
  season: { id: string; label: string } | null;
  nfc: {
    rank: number;
    position: number;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: string | null;
    updatedAt: string;
  } | null;
};

export default async function StandingPage() {
  const user = await getSession();
  if (!user) redirect('/connexion');
  let result: StandingResponse | null = null;
  let error: string | null = null;
  try {
    result = (await getSiteData<StandingResponse>('standings')).data;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Impossible de charger le classement NFC.';
  }
  const standing = result?.nfc;

  return (
    <AppShell user={user}>
      <h1 className="text-3xl font-bold">Classement du NFC</h1>
      <p className="mt-2 text-gray-600">Données affichées depuis GET /api/standings de nfcwebsite.</p>
      {error && <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-900" role="alert">{error}</p>}
      {standing ? (
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">Saison {result?.season?.label ?? 'non renseignée'}</p>
          <h2 className="mt-2 text-2xl font-bold">{standing.teamName} · {standing.rank}{standing.rank === 1 ? 'er' : 'e'}</h2>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Joués', standing.played],
              ['Victoires', standing.won],
              ['Nuls', standing.drawn],
              ['Défaites', standing.lost],
              ['Buts pour', standing.goalsFor],
              ['Buts contre', standing.goalsAgainst],
              ['Différence', standing.goalDifference],
              ['Points', standing.points],
            ].map(([label, value]) => (
              <div className="rounded-lg bg-gray-50 p-4" key={label}>
                <dt className="text-sm text-gray-600">{label}</dt><dd className="mt-1 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5">Forme récente : <strong>{standing.form ?? 'Non renseignée'}</strong></p>
          <p className="mt-2 text-sm text-gray-500">Mis à jour le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Douala' }).format(new Date(standing.updatedAt))}</p>
          <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">Le site n’expose pas d’API pour modifier ou historiser ce classement. Cette vue est en lecture seule.</p>
        </section>
      ) : !error ? <p className="mt-5 rounded-xl bg-white p-5 text-gray-600">L’API du site ne dispose pas d’un classement NFC pour le moment.</p> : null}
    </AppShell>
  );
}
