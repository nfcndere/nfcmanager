'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Inbox,
  Newspaper,
  Radio,
  Trophy,
  Users,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import type {
  ArticleRecord,
  FormSubmissionRecord,
  MatchRecord,
  PlayerRecord,
  StandingResponse,
} from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  Card,
  LetterAvatar,
  StatCard,
  StatusBadge,
} from '@/components/ui';
import { formatDoualaDate, formatDoualaTime } from '@/lib/format';
import { useAppContext } from '@/components/providers/AppProviders';

export function DashboardView() {
  const { nowMs } = useAppContext();
  const matchesQuery = useSiteQuery<MatchRecord[]>(['matches'], 'matches?page=1&pageSize=100');
  const playersQuery = useSiteQuery<PlayerRecord[]>(['players'], 'players');
  const articlesQuery = useSiteQuery<ArticleRecord[]>(['articles', 'all'], 'articles?status=all&limit=50');
  const formsQuery = useSiteQuery<FormSubmissionRecord[]>(['forms', 'unprocessed'], 'forms?processed=false');
  const standingsQuery = useSiteQuery<StandingResponse>(['standings'], 'standings');

  const allQueries = [matchesQuery, playersQuery, articlesQuery, formsQuery, standingsQuery];
  const anyLoading = allQueries.every((q) => q.isPending && !q.data);
  const failedSources: string[] = [];
  if (matchesQuery.isError) failedSources.push('Matchs');
  if (playersQuery.isError) failedSources.push('Effectif');
  if (articlesQuery.isError) failedSources.push('Actualités');
  if (formsQuery.isError) failedSources.push('Inscriptions & messages');
  if (standingsQuery.isError) failedSources.push('Classement');

  if (anyLoading) {
    return <DataState state="loading" />;
  }

  if (failedSources.length === allQueries.length && !matchesQuery.data) {
    return (
      <DataState
        state={matchesQuery.state === 'offline' ? 'offline' : 'error'}
        errorMessage={matchesQuery.errorMessage}
        onRetry={() => allQueries.forEach((q) => void q.refetch())}
      />
    );
  }

  const now = nowMs;
  const matches = matchesQuery.data ?? [];
  const players = playersQuery.data ?? [];
  const articles = articlesQuery.data ?? [];
  const unprocessedForms = formsQuery.data ?? [];
  const standing = standingsQuery.data?.nfc ?? null;
  const season = standingsQuery.data?.season ?? null;

  const liveMatch = matches.find((m) => m.status === 'EN_COURS') ?? null;
  const upcomingMatches = matches
    .filter((m) => m.status === 'PROGRAMME' && Date.parse(m.date) >= now)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const nextMatch = liveMatch ?? upcomingMatches[0] ?? null;

  const overdueMatches = matches.filter(
    (m) => m.status === 'PROGRAMME' && Date.parse(m.date) < now,
  );
  const recentCompleted = matches
    .filter((m) => m.status === 'TERMINE')
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5);

  const academyUnprocessed = unprocessedForms.filter((f) => f.type === 'ACADEMIE').length;
  const contactUnprocessed = unprocessedForms.filter(
    (f) => f.type === 'CONTACT' || f.type === 'BILLETTERIE',
  ).length;
  const draftCount = articles.filter((a) => !a.published).length;

  const standingUpdatedMs = standing?.updatedAt ? Date.parse(standing.updatedAt) : null;
  const isStandingStale = !standingUpdatedMs || now - standingUpdatedMs > 48 * 60 * 60 * 1000;

  const alerts: { id: string; text: string; href: string; cta: string }[] = [];
  if (overdueMatches.length > 0) {
    alerts.push({
      id: 'overdue-matches',
      text: `${overdueMatches.length} match(s) ont une date passée mais restent au statut « Programmé ».`,
      href: '/matchs',
      cta: 'Mettre à jour',
    });
  }
  if (standingsQuery.data && isStandingStale) {
    alerts.push({
      id: 'stale-standing',
      text: 'Le classement NFC n’a pas été actualisé depuis plus de 48 heures.',
      href: '/classement',
      cta: 'Actualiser',
    });
  }
  if (academyUnprocessed > 0) {
    alerts.push({
      id: 'academy-inbox',
      text: `${academyUnprocessed} candidature(s) Académie en attente de validation.`,
      href: '/inscriptions?type=ACADEMIE',
      cta: 'Consulter',
    });
  }
  if (contactUnprocessed > 0) {
    alerts.push({
      id: 'contact-inbox',
      text: `${contactUnprocessed} message(s) ou demande(s) de billetterie en attente.`,
      href: '/inscriptions',
      cta: 'Traiter',
    });
  }
  if (playersQuery.data && players.length === 0) {
    alerts.push({
      id: 'empty-squad',
      text: 'Aucun joueur n’est encore enregistré dans l’effectif.',
      href: '/effectif',
      cta: 'Ajouter un joueur',
    });
  }

  return (
    <DataState
      state={
        failedSources.length > 0
          ? 'partial'
          : matchesQuery.state === 'stale'
            ? 'stale'
            : 'ready'
      }
      partialSources={failedSources}
      updatedAt={matchesQuery.updatedAt}
      onRetry={() => allQueries.forEach((q) => void q.refetch())}
    >
      <div className="space-y-6">
        {/* Points d'attention calmes */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-2.5 text-xs text-[var(--status-warning-text)]"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{alert.text}</span>
                </div>
                <Link
                  href={alert.href}
                  className="font-medium underline hover:opacity-80 inline-flex items-center gap-1"
                >
                  {alert.cta}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* 4 Cartes de statistiques (StatCard) */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Inbox className="h-5 w-5" />}
            value={formsQuery.data ? academyUnprocessed : '—'}
            label="Inscriptions Académie"
            change={academyUnprocessed > 0 ? `${academyUnprocessed} à traiter` : 'À jour'}
            changeTone={academyUnprocessed > 0 ? 'negative' : 'neutral'}
            palette="yellow"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            value={playersQuery.data ? players.length : '—'}
            label="Joueurs sous contrat"
            change={players.length > 0 ? 'Effectif club' : 'Vide'}
            changeTone="neutral"
            palette="blue"
          />
          <StatCard
            icon={<Newspaper className="h-5 w-5" />}
            value={articlesQuery.data ? articles.length : '—'}
            label="Articles & Actualités"
            change={draftCount > 0 ? `${draftCount} brouillon(s)` : 'Tous publiés'}
            changeTone={draftCount > 0 ? 'neutral' : 'positive'}
            palette="rose"
          />
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            value={standing ? `${standing.points} pts` : '—'}
            label={standing ? `${standing.rank}e au classement` : 'Classement club'}
            change={standing ? `${standing.won}V · ${standing.drawn}N · ${standing.lost}D` : 'Non renseigné'}
            changeTone="positive"
            palette="green"
          />
        </section>

        {/* Bloc Prochain match / Direct & Classement actuel */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Prochain Match / Match en direct */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  {nextMatch?.status === 'EN_COURS' ? (
                    <Radio className="h-4 w-4 animate-pulse text-red-500" />
                  ) : (
                    <Calendar className="h-4 w-4 text-[var(--accent)]" />
                  )}
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    {nextMatch?.status === 'EN_COURS' ? 'Match en direct' : 'Prochain match'}
                  </h2>
                </div>
                {nextMatch && (
                  <StatusBadge tone={nextMatch.status === 'EN_COURS' ? 'danger' : 'info'}>
                    {nextMatch.status === 'EN_COURS' ? 'En direct' : 'Programmé'}
                  </StatusBadge>
                )}
              </div>

              {nextMatch ? (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{nextMatch.competition || 'Championnat Elite Two'}</span>
                    <span>{nextMatch.stadium || 'Stade Municipal de Ngaoundéré'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <LetterAvatar name={nextMatch.homeTeam} size="md" />
                      <span className="font-semibold text-sm text-[var(--text)] truncate">
                        {nextMatch.homeTeam}
                      </span>
                    </div>

                    <div className="flex flex-col items-center shrink-0 px-3">
                      <span className="text-xl font-semibold tabular-nums text-[var(--text)]">
                        {nextMatch.homeScore ?? 0} – {nextMatch.awayScore ?? 0}
                      </span>
                      <span className="text-[11px] text-[var(--text-soft)]">
                        {nextMatch.status === 'EN_COURS' ? 'En jeu' : formatDoualaTime(nextMatch.date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
                      <span className="font-semibold text-sm text-[var(--text)] truncate">
                        {nextMatch.awayTeam}
                      </span>
                      <LetterAvatar name={nextMatch.awayTeam} size="md" />
                    </div>
                  </div>

                  <p className="text-center text-xs text-[var(--text-muted)]">
                    {formatDoualaDate(nextMatch.date)}
                  </p>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  Aucun match programmé pour l’instant.
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <Link href="/matchs" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
                Voir tout le calendrier →
              </Link>
              {nextMatch && (
                <Link href={`/matchs?live=${nextMatch.id}`}>
                  <Button variant="primary" size="sm">
                    {nextMatch.status === 'EN_COURS' ? 'Gérer le direct' : 'Fiche du match'}
                  </Button>
                </Link>
              )}
            </div>
          </Card>

          {/* Classement NFC & Forme récente */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    Classement {season ? `(${season.label})` : 'officiel'}
                  </h2>
                </div>
                <Link
                  href="/classement"
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Mettre à jour →
                </Link>
              </div>

              {standing ? (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-[10px] bg-[var(--bg-subtle)] p-3">
                      <span className="text-[11px] text-[var(--text-soft)]">Rang</span>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--accent)]">
                        {standing.rank}
                        <span className="text-xs font-normal ml-0.5">
                          {standing.rank === 1 ? 'er' : 'e'}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-[var(--bg-subtle)] p-3">
                      <span className="text-[11px] text-[var(--text-soft)]">Points</span>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
                        {standing.points}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-[var(--bg-subtle)] p-3">
                      <span className="text-[11px] text-[var(--text-soft)]">Joués</span>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
                        {standing.played}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-[var(--bg-subtle)] p-3">
                      <span className="text-[11px] text-[var(--text-soft)]">Diff.</span>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
                        {standing.goalDifference > 0
                          ? `+${standing.goalDifference}`
                          : standing.goalDifference}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-xs">
                    <span className="text-[var(--text-muted)]">
                      Bilan : <strong>{standing.won}V</strong> · <strong>{standing.drawn}N</strong> · <strong>{standing.lost}D</strong>
                    </span>
                    <span className="text-[var(--text-muted)]">
                      Forme : <strong className="font-mono text-[var(--text)]">{standing.form || '—'}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  Aucun classement enregistré pour la saison courante.
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-soft)]">
                {standing?.updatedAt
                  ? `Actualisé le ${formatDoualaDate(standing.updatedAt)}`
                  : 'En attente de mise à jour'}
              </span>
              <Link
                href="/classement"
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Détail complet →
              </Link>
            </div>
          </Card>
        </div>

        {/* Derniers scores récents */}
        {recentCompleted.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                Derniers matchs joués
              </h2>
              <Link href="/matchs" className="text-xs font-medium text-[var(--accent)] hover:underline">
                Historique complet →
              </Link>
            </div>

            <div className="divide-y divide-[var(--border)] mt-2">
              {recentCompleted.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <LetterAvatar name={m.awayTeam} size="xs" />
                    <span className="font-medium text-[var(--text)] truncate">
                      {m.homeTeam} – {m.awayTeam}
                    </span>
                    <span className="text-[11px] text-[var(--text-soft)] hidden sm:inline">
                      {formatDoualaDate(m.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-semibold text-sm tabular-nums text-[var(--text)]">
                      {m.homeScore ?? 0} : {m.awayScore ?? 0}
                    </span>
                    <StatusBadge tone="success">Terminé</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DataState>
  );
}
