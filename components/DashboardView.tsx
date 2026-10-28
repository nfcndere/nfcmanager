'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Image as ImageIcon,
  Inbox,
  Newspaper,
  Plus,
  Radio,
  Trophy,
  Users,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import type { ArticleRecord, FormSubmissionRecord, MatchRecord, PlayerRecord, StandingResponse } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import { Button, StatusBadge } from '@/components/ui';
import { formatDoualaDate } from '@/lib/format';
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
  const contactUnprocessed = unprocessedForms.filter((f) => f.type === 'CONTACT' || f.type === 'BILLETTERIE').length;
  const draftCount = articles.filter((a) => !a.published).length;

  const standingUpdatedMs = standing?.updatedAt ? Date.parse(standing.updatedAt) : null;
  const isStandingStale = !standingUpdatedMs || now - standingUpdatedMs > 48 * 60 * 60 * 1000;

  const alerts: { id: string; text: string; href: string; cta: string }[] = [];
  if (overdueMatches.length > 0) {
    alerts.push({
      id: 'overdue-matches',
      text: `${overdueMatches.length} match(s) ont une date passée mais sont toujours au statut « Programmé ».`,
      href: '/matchs',
      cta: 'Corriger les matchs',
    });
  }
  if (standingsQuery.data && isStandingStale) {
    alerts.push({
      id: 'stale-standing',
      text: 'Le classement NFC n’a pas été mis à jour depuis plus de 48 h (ou est absent).',
      href: '/classement',
      cta: 'Mettre à jour le classement',
    });
  }
  if (academyUnprocessed > 0) {
    alerts.push({
      id: 'academy-inbox',
      text: `${academyUnprocessed} candidature(s) Académie en attente de traitement.`,
      href: '/inscriptions?type=ACADEMIE',
      cta: 'Traiter les candidatures',
    });
  }
  if (playersQuery.data && players.length === 0) {
    alerts.push({
      id: 'empty-squad',
      text: 'Aucun joueur n’est enregistré dans l’effectif.',
      href: '/effectif',
      cta: 'Ajouter un joueur',
    });
  }

  return (
    <DataState
      state={failedSources.length > 0 ? 'partial' : matchesQuery.state === 'stale' ? 'stale' : 'ready'}
      partialSources={failedSources}
      updatedAt={matchesQuery.updatedAt}
      onRetry={() => allQueries.forEach((q) => void q.refetch())}
    >
      <div className="space-y-6">
        {/* Actions rapides mobile-first */}
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Link
            href="/matchs?nouveau=1"
            className="flex items-center gap-2.5 nfc-card p-3.5 font-semibold shadow-2xs transition hover:border-[var(--nfc-green)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nfc-green)] text-white">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs sm:text-sm">Nouveau match</span>
          </Link>
          <Link
            href="/actualites?nouveau=1"
            className="flex items-center gap-2.5 nfc-card p-3.5 font-semibold shadow-2xs transition hover:border-[var(--nfc-green)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nfc-green)] text-white">
              <Newspaper className="h-5 w-5" />
            </span>
            <span className="text-xs sm:text-sm">Nouvelle actualité</span>
          </Link>
          <Link
            href="/medias"
            className="flex items-center gap-2.5 nfc-card p-3.5 font-semibold shadow-2xs transition hover:border-[var(--nfc-green)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nfc-green)]/15 text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
              <ImageIcon className="h-5 w-5" />
            </span>
            <span className="text-xs sm:text-sm">Ajouter un média</span>
          </Link>
          <Link
            href="/classement"
            className="flex items-center gap-2.5 nfc-card p-3.5 font-semibold shadow-2xs transition hover:border-[var(--nfc-green)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nfc-green)]/15 text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="text-xs sm:text-sm">Classement NFC</span>
          </Link>
        </section>

        {/* Alertes prioritaires */}
        {alerts.length > 0 && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">
                Points d’attention ({alerts.length})
              </h2>
            </div>
            <ul className="mt-3 space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--nfc-card)] px-3.5 py-2.5 text-xs sm:text-sm"
                >
                  <span>{alert.text}</span>
                  <Link
                    href={alert.href}
                    className="inline-flex items-center gap-1 font-semibold text-[var(--nfc-green)] hover:underline dark:text-[var(--nfc-yellow)]"
                  >
                    {alert.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Candidatures Académie"
            value={formsQuery.data ? String(academyUnprocessed) : '—'}
            sub="à traiter"
            icon={Inbox}
            href="/inscriptions?type=ACADEMIE"
            highlight={academyUnprocessed > 0}
          />
          <KpiCard
            label="Messages & Billetterie"
            value={formsQuery.data ? String(contactUnprocessed) : '—'}
            sub="non traités"
            icon={Inbox}
            href="/inscriptions"
            highlight={contactUnprocessed > 0}
          />
          <KpiCard
            label="Effectif actif"
            value={playersQuery.data ? String(players.length) : '—'}
            sub="joueurs inscrits"
            icon={Users}
            href="/effectif"
          />
          <KpiCard
            label="Actualités"
            value={articlesQuery.data ? String(articles.length) : '—'}
            sub={draftCount > 0 ? `dont ${draftCount} brouillon(s)` : 'publiées'}
            icon={Newspaper}
            href="/actualites"
          />
        </section>

        {/* Match en direct / Prochain match + Classement */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="nfc-card p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {nextMatch?.status === 'EN_COURS' ? (
                  <Radio className="h-5 w-5 animate-pulse text-red-500" />
                ) : (
                  <Calendar className="h-5 w-5 text-[var(--nfc-green)]" />
                )}
                <h2 className="font-display text-lg font-bold uppercase tracking-wide">
                  {nextMatch?.status === 'EN_COURS' ? 'Match en direct' : 'Prochain match'}
                </h2>
              </div>
              {nextMatch && (
                <StatusBadge tone={nextMatch.status === 'EN_COURS' ? 'danger' : 'brand'}>
                  {nextMatch.status === 'EN_COURS' ? 'EN DIRECT' : 'PROGRAMMÉ'}
                </StatusBadge>
              )}
            </div>

            {nextMatch ? (
              <div className="mt-4 rounded-2xl bg-[var(--nfc-input-bg)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--nfc-muted)]">
                  {nextMatch.competition || 'Championnat'} · {nextMatch.stadium || 'Stade non précisé'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-bold">{nextMatch.homeTeam}</span>
                  <span className="rounded-xl bg-[var(--nfc-card)] px-3 py-1.5 font-display text-xl font-bold">
                    {nextMatch.homeScore ?? 0} - {nextMatch.awayScore ?? 0}
                  </span>
                  <span className="font-display text-lg font-bold text-right">{nextMatch.awayTeam}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--nfc-muted)]">{formatDoualaDate(nextMatch.date)}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/matchs?live=${nextMatch.id}`} className="flex-1">
                    <Button variant="primary" size="md" className="w-full">
                      <Radio className="h-4 w-4" />
                      Mode Match en direct
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--nfc-muted)]">
                Aucun match programmé ou en cours pour le moment.
              </p>
            )}
          </section>

          <section className="nfc-card p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">
                Position au classement {season ? `(${season.label})` : ''}
              </h2>
              <Link
                href="/classement"
                className="text-xs font-semibold text-[var(--nfc-green)] hover:underline dark:text-[var(--nfc-yellow)]"
              >
                Modifier →
              </Link>
            </div>

            {standing ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-[var(--nfc-input-bg)] p-3">
                    <span className="text-xs text-[var(--nfc-muted)]">Rang</span>
                    <p className="mt-0.5 font-display text-2xl font-bold text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
                      {standing.rank}
                      {standing.rank === 1 ? 'er' : 'e'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--nfc-input-bg)] p-3">
                    <span className="text-xs text-[var(--nfc-muted)]">Points</span>
                    <p className="mt-0.5 font-display text-2xl font-bold">{standing.points}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--nfc-input-bg)] p-3">
                    <span className="text-xs text-[var(--nfc-muted)]">Joués</span>
                    <p className="mt-0.5 font-display text-2xl font-bold">{standing.played}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--nfc-input-bg)] p-3">
                    <span className="text-xs text-[var(--nfc-muted)]">Diff.</span>
                    <p className="mt-0.5 font-display text-2xl font-bold">
                      {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[var(--nfc-muted)]">
                  Bilan : {standing.won}V · {standing.drawn}N · {standing.lost}D — Forme :{' '}
                  <strong className="text-[var(--nfc-text)]">{standing.form || 'Non renseignée'}</strong>
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--nfc-muted)]">
                Aucun classement enregistré pour la saison courante.
              </p>
            )}

            {recentCompleted.length > 0 && (
              <div className="mt-5 border-t border-[var(--nfc-divider)] pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--nfc-muted)]">
                  Derniers scores enregistrés
                </h3>
                <ul className="mt-2 divide-y divide-[var(--nfc-border)] text-sm">
                  {recentCompleted.slice(0, 3).map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2">
                      <span className="truncate">
                        {m.homeTeam} – {m.awayTeam}
                      </span>
                      <span className="font-display font-bold">
                        {m.homeScore ?? 0} : {m.awayScore ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </DataState>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition hover:border-[var(--nfc-green)] ${
        highlight
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-[var(--nfc-divider)] bg-[var(--nfc-card)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--nfc-muted)]">{label}</span>
        <Icon className="h-4 w-4 text-[var(--nfc-muted)]" />
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-[var(--nfc-text)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">{sub}</p>
    </Link>
  );
}
