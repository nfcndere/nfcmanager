'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Edit3,
  MapPin,
  Plus,
  Radio,
  Save,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { ApiClientError, siteRequest } from '@/lib/api/client';
import { MATCH_STATUSES, type MatchRecord, type MatchStatus } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  NumberStepper,
  SegmentedControl,
  Select,
  SheetDialog,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { useAppContext } from '@/components/providers/AppProviders';
import { enqueueMutation } from '@/lib/offline-queue';
import { formatDoualaDate, toDoualaDateTimeLocalValue } from '@/lib/format';

const STATUS_LABELS: Record<MatchStatus, string> = {
  PROGRAMME: 'Programmé',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  REPORTE: 'Reporté',
  ANNULE: 'Annulé',
};

const STATUS_TONES: Record<MatchStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'> = {
  PROGRAMME: 'info',
  EN_COURS: 'danger',
  TERMINE: 'success',
  REPORTE: 'warning',
  ANNULE: 'neutral',
};

function MatchManagementInner({ canWrite }: { canWrite: boolean }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { online, nowMs, notify, refreshOfflineQueue } = useAppContext();

  const matchesQuery = useSiteQuery<MatchRecord[]>(['matches'], 'matches?page=1&pageSize=100');
  const [filter, setFilter] = useState<'ALL' | MatchStatus>('ALL');
  const [search, setSearch] = useState('');

  // État modale création / édition
  const [sheetOpen, setSheetOpen] = useState(() =>
    Boolean(searchParams.get('nouveau') === '1' && canWrite),
  );
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Champs contrôlés du formulaire
  const [dateValue, setDateValue] = useState(() =>
    toDoualaDateTimeLocalValue(new Date().toISOString()),
  );
  const [homeTeam, setHomeTeam] = useState('Ngaoundéré FC');
  const [awayTeam, setAwayTeam] = useState('');
  const [stadium, setStadium] = useState('Stade Municipal de Ngaoundéré');
  const [competition, setCompetition] = useState('Elite Two');
  const [status, setStatus] = useState<MatchStatus>('PROGRAMME');
  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [summary, setSummary] = useState('');

  // Mode Match en direct (plein écran)
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [liveHomeScore, setLiveHomeScore] = useState(0);
  const [liveAwayScore, setLiveAwayScore] = useState(0);
  const [liveStatus, setLiveStatus] = useState<MatchStatus>('EN_COURS');
  const [liveSummary, setLiveSummary] = useState('');
  const [livePending, setLivePending] = useState(false);

  // Suppression
  const [deletingMatch, setDeletingMatch] = useState<MatchRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const openCreate = () => {
    setEditingMatch(null);
    setDateValue(toDoualaDateTimeLocalValue(new Date().toISOString()));
    setHomeTeam('Ngaoundéré FC');
    setAwayTeam('');
    setStadium('Stade Municipal de Ngaoundéré');
    setCompetition('Elite Two');
    setStatus('PROGRAMME');
    setHomeScore('');
    setAwayScore('');
    setSummary('');
    setSheetOpen(true);
  };

  const openEdit = (match: MatchRecord) => {
    setEditingMatch(match);
    setDateValue(toDoualaDateTimeLocalValue(match.date));
    setHomeTeam(match.homeTeam);
    setAwayTeam(match.awayTeam);
    setStadium(match.stadium ?? '');
    setCompetition(match.competition ?? '');
    setStatus(match.status);
    setHomeScore(match.homeScore !== null && match.homeScore !== undefined ? String(match.homeScore) : '');
    setAwayScore(match.awayScore !== null && match.awayScore !== undefined ? String(match.awayScore) : '');
    setSummary(match.summary ?? '');
    setSheetOpen(true);
  };

  const openLiveMode = (match: MatchRecord) => {
    setLiveMatchId(match.id);
    setLiveHomeScore(match.homeScore ?? 0);
    setLiveAwayScore(match.awayScore ?? 0);
    setLiveStatus(match.status === 'PROGRAMME' ? 'EN_COURS' : match.status);
    setLiveSummary(match.summary ?? '');
  };

  useEffect(() => {
    const requestedLive = searchParams.get('live');
    if (!requestedLive || !matchesQuery.data) return;
    const target = matchesQuery.data.find((m) => m.id === requestedLive);
    if (!target) return;
    const timer = setTimeout(() => {
      openLiveMode(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, matchesQuery.data]);

  const matches = useMemo(() => matchesQuery.data ?? [], [matchesQuery.data]);
  const now = nowMs;

  const overdueMatches = useMemo(
    () => matches.filter((m) => m.status === 'PROGRAMME' && Date.parse(m.date) < now),
    [matches, now],
  );

  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => (filter === 'ALL' ? true : m.status === filter))
      .filter((m) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          (m.competition ?? '').toLowerCase().includes(q) ||
          (m.stadium ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [matches, filter, search]);

  const activeLiveMatch = useMemo(
    () => matches.find((m) => m.id === liveMatchId) ?? null,
    [matches, liveMatchId],
  );

  async function handleSaveMatch(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      notify({ title: 'Date de match invalide.', tone: 'error' });
      setSaving(false);
      return;
    }

    const payload = {
      date: parsedDate.toISOString(),
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      stadium: stadium.trim() || null,
      competition: competition.trim() || null,
      status,
      homeScore: homeScore === '' ? null : Number(homeScore),
      awayScore: awayScore === '' ? null : Number(awayScore),
      summary: summary.trim() || null,
    };

    try {
      if (editingMatch) {
        await siteRequest(`matches/${editingMatch.id}`, {
          method: 'PATCH',
          body: payload,
        });
        notify({ title: 'Match mis à jour avec succès.', tone: 'success' });
      } else {
        await siteRequest('matches', {
          method: 'POST',
          body: payload,
        });
        notify({ title: 'Nouveau match programmé.', tone: 'success' });
      }
      setSheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enregistrement impossible.';
      notify({ title: message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLive(nextStatus: MatchStatus) {
    if (!activeLiveMatch || !canWrite) return;
    setLivePending(true);
    const payload = {
      homeScore: liveHomeScore,
      awayScore: liveAwayScore,
      status: nextStatus,
      summary: liveSummary.trim() || null,
    };

    const queueOffline = async () => {
      await enqueueMutation({
        type: 'live_score',
        label: `Score direct ${activeLiveMatch.homeTeam} ${liveHomeScore}-${liveAwayScore} ${activeLiveMatch.awayTeam}`,
        endpoint: `matches/${activeLiveMatch.id}`,
        method: 'PATCH',
        payload,
        entityEndpoint: `matches/${activeLiveMatch.id}`,
        expectedUpdatedAt: activeLiveMatch.updatedAt,
      });
      await refreshOfflineQueue();
      notify({
        title: 'Hors ligne : score enregistré dans la file d’attente',
        description: 'Il sera synchronisé automatiquement dès le retour du réseau.',
        tone: 'warning',
      });
    };

    if (!online) {
      await queueOffline();
      setLivePending(false);
      return;
    }

    try {
      await siteRequest(`matches/${activeLiveMatch.id}`, {
        method: 'PATCH',
        body: payload,
      });
      setLiveStatus(nextStatus);
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      notify({
        title:
          nextStatus === 'TERMINE'
            ? 'Match terminé et score final publié !'
            : 'Score en direct mis à jour !',
        tone: 'success',
      });
      if (nextStatus === 'TERMINE') {
        setLiveMatchId(null);
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.kind === 'offline') {
        await queueOffline();
      } else {
        notify({
          title: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du direct.',
          tone: 'error',
        });
      }
    } finally {
      setLivePending(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingMatch) return;
    const target = deletingMatch;
    setDeletePending(true);
    try {
      await siteRequest(`matches/${target.id}`, { method: 'DELETE' });
      setDeletingMatch(null);
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      notify({
        title: `Match « ${target.homeTeam} – ${target.awayTeam} » supprimé.`,
        tone: 'info',
        actionLabel: 'Annuler (5s)',
        onAction: async () => {
          await siteRequest(`matches/${target.id}`, {
            method: 'PATCH',
            body: { restore: true },
          });
          await queryClient.invalidateQueries({ queryKey: ['matches'] });
          notify({ title: 'Match restauré.', tone: 'success' });
        },
      });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible de supprimer ce match.',
        tone: 'error',
      });
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Barre d’outils */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'Tous', count: matches.length },
            {
              value: 'EN_COURS',
              label: 'En direct',
              count: matches.filter((m) => m.status === 'EN_COURS').length,
            },
            {
              value: 'PROGRAMME',
              label: 'Programmés',
              count: matches.filter((m) => m.status === 'PROGRAMME').length,
            },
            {
              value: 'TERMINE',
              label: 'Terminés',
              count: matches.filter((m) => m.status === 'TERMINE').length,
            },
          ]}
        />

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Rechercher une équipe, compétition…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          {canWrite && (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau match
            </Button>
          )}
        </div>
      </div>

      {/* Alerte matchs programmés dont la date est passée */}
      {overdueMatches.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              <strong>{overdueMatches.length} match(s)</strong> ont une date dépassée mais sont encore au statut « Programmé ». Saisissez le score final ou passez-les en « Terminé ».
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setFilter('PROGRAMME')}
          >
            Afficher ces matchs
          </Button>
        </div>
      )}

      <DataState
        state={matchesQuery.state}
        errorMessage={matchesQuery.errorMessage}
        updatedAt={matchesQuery.updatedAt}
        onRetry={() => void matchesQuery.refetch()}
        emptyTitle="Aucun match enregistré"
        emptyDescription="Ajoutez les rencontres de la saison pour afficher le calendrier et les scores en direct."
        emptyAction={
          canWrite ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Programmer un match
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-3.5 md:grid-cols-2">
          {filteredMatches.map((match) => {
            const isOverdue = match.status === 'PROGRAMME' && Date.parse(match.date) < now;
            return (
              <article
                key={match.id}
                className={`rounded-2xl border bg-[var(--nfc-card)] p-4 shadow-2xs transition ${
                  match.status === 'EN_COURS'
                    ? 'border-red-500/50 ring-2 ring-red-500/15'
                    : isOverdue
                      ? 'border-amber-500/50'
                      : 'border-[var(--nfc-border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--nfc-muted)]">
                    <Trophy className="h-3.5 w-3.5 text-[var(--nfc-green)]" />
                    <span className="font-semibold">{match.competition || 'Championnat'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isOverdue && <StatusBadge tone="warning">Date dépassée</StatusBadge>}
                    <StatusBadge tone={STATUS_TONES[match.status]}>
                      {STATUS_LABELS[match.status]}
                    </StatusBadge>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl bg-[var(--nfc-input-bg)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-base font-bold sm:text-lg">
                      {match.homeTeam}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] px-3.5 py-1.5 font-heading text-xl font-bold tracking-wider">
                    {match.homeScore !== null && match.homeScore !== undefined ? match.homeScore : '–'}
                    {' : '}
                    {match.awayScore !== null && match.awayScore !== undefined ? match.awayScore : '–'}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate font-heading text-base font-bold sm:text-lg">
                      {match.awayTeam}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--nfc-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDoualaDate(match.date)}
                  </span>
                  {match.stadium && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {match.stadium}
                    </span>
                  )}
                </div>

                {match.summary && (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--nfc-muted)]">{match.summary}</p>
                )}

                {canWrite && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--nfc-border)] pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={match.status === 'EN_COURS' ? 'danger' : 'primary'}
                      onClick={() => openLiveMode(match)}
                    >
                      <Radio className="h-3.5 w-3.5" />
                      {match.status === 'EN_COURS' ? 'Gérer le direct' : 'Mode Direct / Score'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(match)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingMatch(match)}
                      className="ml-auto text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </DataState>

      {/* Mode Match en direct (Plein écran mobile pour le bord de terrain) */}
      {activeLiveMatch && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-[var(--nfc-dark)] p-5 text-white safe-top safe-bottom"
          role="dialog"
          aria-modal="true"
          aria-label="Mode Match en direct"
        >
          <div className="mx-auto flex w-full max-w-xl items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 animate-ping rounded-full bg-red-500" />
              <span className="font-heading text-sm font-bold uppercase tracking-widest text-[var(--nfc-yellow)]">
                Mode Bord de Terrain · Direct
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLiveMatchId(null)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
              aria-label="Fermer le mode direct"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-auto my-6 w-full max-w-xl space-y-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/60">
                {activeLiveMatch.competition || 'Championnat'} · {formatDoualaDate(activeLiveMatch.date)}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold">
                Statut actuel : {STATUS_LABELS[liveStatus]}
              </div>
            </div>

            <div className="grid gap-4 rounded-3xl border border-white/15 bg-[var(--nfc-surface)] p-5 sm:grid-cols-2">
              <div className="flex flex-col items-center rounded-2xl bg-black/25 p-4">
                <p className="text-center font-heading text-xl font-bold uppercase tracking-wide">
                  {activeLiveMatch.homeTeam}
                </p>
                <span className="mb-3 text-xs text-white/60">Domicile</span>
                <NumberStepper
                  label="Buts domicile"
                  value={liveHomeScore}
                  onChange={setLiveHomeScore}
                  min={0}
                  max={30}
                />
              </div>

              <div className="flex flex-col items-center rounded-2xl bg-black/25 p-4">
                <p className="text-center font-heading text-xl font-bold uppercase tracking-wide">
                  {activeLiveMatch.awayTeam}
                </p>
                <span className="mb-3 text-xs text-white/60">Extérieur</span>
                <NumberStepper
                  label="Buts extérieur"
                  value={liveAwayScore}
                  onChange={setLiveAwayScore}
                  min={0}
                  max={30}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/75">
                Note / Résumé du match (buteurs, temps forts)
              </label>
              <textarea
                rows={2}
                value={liveSummary}
                onChange={(e) => setLiveSummary(e.target.value)}
                placeholder="Ex: 34' But de Mohamadou (1-0)..."
                className="w-full rounded-xl border border-white/20 bg-black/30 p-3 text-sm text-white placeholder:text-white/40 focus:border-[var(--nfc-yellow)] focus:outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                variant="primary"
                loading={livePending}
                onClick={() => void handleSaveLive('EN_COURS')}
                className="min-h-14 text-base"
              >
                <Save className="h-5 w-5" />
                Publier le score en direct
              </Button>

              <Button
                type="button"
                size="lg"
                variant="secondary"
                loading={livePending}
                onClick={() => void handleSaveLive('TERMINE')}
                className="min-h-14 border-white/20 bg-white/10 text-base text-white hover:bg-white/20"
              >
                <CheckCircle2 className="h-5 w-5 text-[var(--nfc-yellow)]" />
                Terminer le match
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-white/50">
            Aucun envoi automatique au toucher : cliquez sur « Publier le score en direct » pour envoyer au site officiel (ou mettre en file d’attente hors ligne).
          </p>
        </div>
      )}

      {/* Tiroir Création / Édition complète */}
      <SheetDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingMatch ? 'Modifier le match' : 'Programmer un nouveau match'}
        description="Tous les champs sont synchronisés avec le calendrier officiel de nfcwebsite."
      >
        <form onSubmit={handleSaveMatch} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Équipe à domicile" required>
              <Input
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                required
              />
            </Field>
            <Field label="Équipe à l’extérieur" required>
              <Input
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Ex: Coton Sport"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date et heure (Africa/Douala)" required>
              <Input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                required
              />
            </Field>
            <Field label="Statut de la rencontre" required>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as MatchStatus)}
              >
                {MATCH_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Compétition">
              <Input
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                placeholder="Elite Two, Coupe du Cameroun…"
              />
            </Field>
            <Field label="Stade">
              <Input
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                placeholder="Stade Municipal de Ngaoundéré"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[var(--nfc-input-bg)] p-4">
            <Field label="Score domicile" hint="Laisser vide si non joué">
              <Input
                type="number"
                min={0}
                max={50}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="–"
              />
            </Field>
            <Field label="Score extérieur" hint="Laisser vide si non joué">
              <Input
                type="number"
                min={0}
                max={50}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="–"
              />
            </Field>
          </div>

          <Field label="Résumé / Compte-rendu du match">
            <Textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Buteurs, faits marquants, contexte..."
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-[var(--nfc-border)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              {editingMatch ? 'Enregistrer les modifications' : 'Créer le match'}
            </Button>
          </div>
        </form>
      </SheetDialog>

      <ConfirmDialog
        open={Boolean(deletingMatch)}
        onClose={() => setDeletingMatch(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletePending}
        title="Supprimer ce match ?"
        description={
          deletingMatch
            ? `La rencontre « ${deletingMatch.homeTeam} – ${deletingMatch.awayTeam} » sera masquée du site public. Vous disposerez de 5 secondes pour annuler.`
            : ''
        }
        confirmLabel="Supprimer le match"
      />
    </div>
  );
}

export function MatchManagement({ canWrite }: { canWrite: boolean }) {
  return (
    <Suspense fallback={<DataState state="loading" />}>
      <MatchManagementInner canWrite={canWrite} />
    </Suspense>
  );
}
