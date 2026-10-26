import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getSession } from '@/lib/auth';
import { getSiteData } from '@/lib/site-api';

type Match = {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  updatedAt: string;
};
type Player = { id: string; updatedAt: string };
type Article = { id: string; publishedAt: string | null; updatedAt: string };
type Submission = { id: string; processed: boolean; createdAt: string };
type StandingResponse = {
  season: { id: string; label: string } | null;
  nfc: {
    played: number;
    updatedAt: string;
  } | null;
};
type Overview = {
  nextMatch: Match | null;
  liveMatch: Match | null;
};

const doualaDate = (date: string | null | undefined) =>
  date
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Douala' }).format(new Date(date))
    : 'Non renseigné';

async function load<T>(path: string) {
  try {
    return { data: (await getSiteData<T>(path)).data, error: null };
  } catch (error) {
    console.error(`Chargement de ${path} depuis nfcwebsite impossible:`, error);
    return { data: null, error: `API nfcwebsite indisponible pour ${path}.` };
  }
}

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect('/connexion');

  const [matchesResponse, playersResponse, articlesResponse, academyResponse, contactsResponse, standingsResponse, overviewResponse] =
    await Promise.all([
      load<Match[]>('matches?page=1&pageSize=100'),
      load<Player[]>('players'),
      load<Article[]>('articles?limit=100'),
      load<Submission[]>('forms?type=ACADEMIE&processed=false'),
      load<Submission[]>('forms?type=CONTACT&processed=false'),
      load<StandingResponse>('standings'),
      load<Overview>('club-overview'),
    ]);

  const now = new Date();
  const matches = matchesResponse.data ?? [];
  const completedMatches = matches.filter((match) => match.status === 'TERMINE');
  const recentMatches = completedMatches.slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  const overdueMatches = matches.filter((match) => match.status === 'PROGRAMME' && Date.parse(match.date) < now.getTime());
  const players = playersResponse.data;
  const articles = articlesResponse.data ?? [];
  const publishedDates = articles.map((article) => article.publishedAt).filter((value): value is string => Boolean(value));
  const latestPublishedAt = publishedDates.map((value) => Date.parse(value)).filter(Number.isFinite).sort((a, b) => b - a)[0];
  const standing = standingsResponse.data?.nfc;
  const lastStandingUpdate = standing?.updatedAt ? Date.parse(standing.updatedAt) : null;
  const alerts: string[] = [];
  if (matchesResponse.data && overdueMatches.length > 0) alerts.push(`${overdueMatches.length} match(s) programmé(s) sont passés.`);
  if (standingsResponse.data && (!lastStandingUpdate || now.getTime() - lastStandingUpdate > 48 * 60 * 60 * 1000)) {
    alerts.push('Les statistiques du NFC n’ont pas été mises à jour depuis plus de 48 h, ou sont absentes.');
  }
  if (players && players.length === 0) alerts.push('L’effectif est vide.');
  if (articlesResponse.data && (!latestPublishedAt || now.getTime() - latestPublishedAt > 7 * 24 * 60 * 60 * 1000)) {
    alerts.push('Aucune actualité publiée au cours des 7 derniers jours.');
  }

  const nextMatch = overviewResponse.data?.liveMatch ?? overviewResponse.data?.nextMatch ?? null;
  const errors = [
    matchesResponse.error,
    playersResponse.error,
    articlesResponse.error,
    academyResponse.error,
    contactsResponse.error,
    standingsResponse.error,
    overviewResponse.error,
  ].filter((error): error is string => Boolean(error));

  return (
    <AppShell user={user}>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-nfc-green">Vue d’ensemble</p>
        <h1 className="mt-2 text-3xl font-bold">Tableau de bord</h1>
      </div>
      {errors.length > 0 && (
        <section className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <h2 className="font-bold">Certaines données n’ont pas pu être chargées depuis nfcwebsite</h2>
          <ul className="mt-2 list-inside list-disc">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Inscriptions académie à traiter', academyResponse.data?.length],
          ['Messages de contact à traiter', contactsResponse.data?.length],
          ['Joueurs', playersResponse.data?.length],
          ['Matchs enregistrés', matchesResponse.data?.length],
        ].map(([label, count]) => (
          <section className="rounded-xl bg-white p-5 shadow-sm" key={label}>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="mt-3 text-3xl font-bold">{count ?? 'Donnée indisponible'}</p>
          </section>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">{nextMatch?.status === 'EN_COURS' ? 'Match en cours' : 'Prochain match'}</h2>
          {nextMatch ? (
            <div className="mt-4">
              <p className="font-semibold">{nextMatch.homeTeam} – {nextMatch.awayTeam}</p>
              <p className="mt-1 text-sm text-gray-600">{doualaDate(nextMatch.date)}</p>
              {nextMatch.homeScore !== null && nextMatch.awayScore !== null && <p className="mt-2 text-xl font-bold">{nextMatch.homeScore} : {nextMatch.awayScore}</p>}
            </div>
          ) : <p className="mt-4 text-gray-600">{overviewResponse.data ? 'Aucun prochain match enregistré.' : 'Donnée indisponible.'}</p>}
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Derniers résultats</h2>
          {recentMatches.length ? (
            <ul className="mt-3 divide-y">
              {recentMatches.map((match) => (
                <li className="flex items-center justify-between gap-3 py-3 text-sm" key={match.id}>
                  <span>{match.homeTeam} – {match.awayTeam}</span>
                  <strong>{match.homeScore ?? 'Non saisi'} : {match.awayScore ?? 'Non saisi'}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-gray-600">{matchesResponse.data ? 'Aucun résultat enregistré.' : 'Donnée indisponible.'}</p>}
        </section>
      </div>
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Alertes</h2>
        {alerts.length ? (
          <ul className="mt-3 space-y-2">
            {alerts.map((alert) => <li className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950" key={alert}>{alert}</li>)}
          </ul>
        ) : errors.length ? <p className="mt-3 text-gray-600">Les alertes sont incomplètes tant que certaines données de l’API ne sont pas disponibles.</p>
          : <p className="mt-3 text-gray-600">Aucune alerte.</p>}
        {standing && <p className="mt-4 text-xs text-gray-500">Classement mis à jour : {doualaDate(standing.updatedAt)}</p>}
        {articlesResponse.data && <p className="mt-2 text-xs text-gray-500">L’API publique ne retourne que les actualités publiées; le nombre de brouillons n’est pas disponible.</p>}
      </section>
    </AppShell>
  );
}
