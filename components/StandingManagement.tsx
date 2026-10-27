'use client';

import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  History,
  Plus,
  Save,
  Trophy,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import type {
  NfcStanding,
  SeasonRecord,
  StandingHistoryRecord,
  StandingResponse,
} from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import { Button, Field, Input, SheetDialog, StatusBadge, Switch } from '@/components/ui';
import { useAppContext } from '@/components/providers/AppProviders';
import { calculateStandingStats, formatDoualaDate } from '@/lib/format';

export function StandingManagement({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const { nowMs, notify } = useAppContext();

  const standingQuery = useSiteQuery<StandingResponse>(
    ['standings'],
    'standings',
    { isEmpty: () => false },
  );
  const historyQuery = useSiteQuery<StandingHistoryRecord[]>(
    ['standings-history'],
    'standings/history?limit=15',
  );
  const seasonsQuery = useSiteQuery<SeasonRecord[]>(['seasons'], 'seasons');

  const [prevNfc, setPrevNfc] = useState<NfcStanding | null | undefined>(undefined);
  const [position, setPosition] = useState('1');
  const [won, setWon] = useState('0');
  const [drawn, setDrawn] = useState('0');
  const [lost, setLost] = useState('0');
  const [goalsFor, setGoalsFor] = useState('0');
  const [goalsAgainst, setGoalsAgainst] = useState('0');
  const [formSeries, setFormSeries] = useState('V-V-N');
  const [savingStanding, setSavingStanding] = useState(false);

  // Création de saison
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false);
  const [seasonLabel, setSeasonLabel] = useState('');
  const [seasonStartYear, setSeasonStartYear] = useState(String(new Date().getFullYear()));
  const [seasonEndYear, setSeasonEndYear] = useState(String(new Date().getFullYear() + 1));
  const [seasonIsCurrent, setSeasonIsCurrent] = useState(true);
  const [savingSeason, setSavingSeason] = useState(false);

  if (standingQuery.data?.nfc && standingQuery.data.nfc !== prevNfc) {
    const nfc = standingQuery.data.nfc;
    setPrevNfc(nfc);
    setPosition(String(nfc.position ?? nfc.rank ?? 1));
    setWon(String(nfc.won ?? 0));
    setDrawn(String(nfc.drawn ?? 0));
    setLost(String(nfc.lost ?? 0));
    setGoalsFor(String(nfc.goalsFor ?? 0));
    setGoalsAgainst(String(nfc.goalsAgainst ?? 0));
    setFormSeries(nfc.form ?? '');
  }

  const computed = calculateStandingStats({
    won: Math.max(0, Number(won) || 0),
    drawn: Math.max(0, Number(drawn) || 0),
    lost: Math.max(0, Number(lost) || 0),
    goalsFor: Math.max(0, Number(goalsFor) || 0),
    goalsAgainst: Math.max(0, Number(goalsAgainst) || 0),
  });

  const normalizedForm = formSeries.trim().toUpperCase();
  const isFormValid =
    normalizedForm === '' || /^(V|N|D)(-(V|N|D)){0,4}$/.test(normalizedForm);

  const nfc = standingQuery.data?.nfc;
  const season = standingQuery.data?.season;
  const isStale48h =
    !nfc?.updatedAt || nowMs - Date.parse(nfc.updatedAt) > 48 * 60 * 60 * 1000;

  async function handleSaveStanding(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    if (!isFormValid) {
      notify({
        title: 'Format de série invalide.',
        description: 'Utilisez jusqu’à 5 résultats séparés par des tirets (ex: V-V-N-D-V).',
        tone: 'error',
      });
      return;
    }

    setSavingStanding(true);
    try {
      await siteRequest('standings', {
        method: 'PUT',
        body: {
          seasonId: season?.id,
          teamName: 'Ngaoundéré FC',
          position: Math.max(1, Number(position) || 1),
          played: computed.played,
          won: Math.max(0, Number(won) || 0),
          drawn: Math.max(0, Number(drawn) || 0),
          lost: Math.max(0, Number(lost) || 0),
          goalsFor: Math.max(0, Number(goalsFor) || 0),
          goalsAgainst: Math.max(0, Number(goalsAgainst) || 0),
          goalDifference: computed.goalDifference,
          points: computed.points,
          form: normalizedForm || null,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['standings'] }),
        queryClient.invalidateQueries({ queryKey: ['standings-history'] }),
      ]);
      notify({ title: 'Classement du NFC mis à jour et historisé !', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible d’enregistrer le classement.',
        tone: 'error',
      });
    } finally {
      setSavingStanding(false);
    }
  }

  async function handleCreateSeason(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSavingSeason(true);
    try {
      await siteRequest('seasons', {
        method: 'POST',
        body: {
          label: seasonLabel.trim(),
          startYear: Number(seasonStartYear),
          endYear: Number(seasonEndYear),
          isCurrent: seasonIsCurrent,
        },
      });
      setSeasonSheetOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['seasons'] }),
        queryClient.invalidateQueries({ queryKey: ['standings'] }),
      ]);
      notify({ title: 'Saison créée avec succès.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible de créer la saison.',
        tone: 'error',
      });
    } finally {
      setSavingSeason(false);
    }
  }

  async function handleSetCurrentSeason(seasonId: string) {
    if (!canWrite) return;
    try {
      await siteRequest(`seasons/${seasonId}`, {
        method: 'PATCH',
        body: { isCurrent: true },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['seasons'] }),
        queryClient.invalidateQueries({ queryKey: ['standings'] }),
      ]);
      notify({ title: 'Saison courante changée.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible de changer la saison courante.',
        tone: 'error',
      });
    }
  }

  const appendFormToken = (token: 'V' | 'N' | 'D') => {
    const parts = normalizedForm ? normalizedForm.split('-').filter(Boolean) : [];
    const next = [...parts, token].slice(-5);
    setFormSeries(next.join('-'));
  };

  return (
    <DataState
      state={standingQuery.state}
      errorMessage={standingQuery.errorMessage}
      updatedAt={standingQuery.updatedAt}
      onRetry={() => void standingQuery.refetch()}
    >
      <div className="space-y-6">
        {isStale48h && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Actualisation du classement recommandée</p>
              <p className="mt-0.5 text-xs opacity-90">
                Le classement du NFC n’a pas été mis à jour depuis plus de 48 heures (dernière mise à jour :{' '}
                {nfc?.updatedAt ? formatDoualaDate(nfc.updatedAt) : 'jamais'}).
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulaire d'édition du classement NFC */}
          <section className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-5 shadow-2xs lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-[var(--nfc-green)]" />
                <div>
                  <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
                    Statistiques & Position du Ngaoundéré FC
                  </h2>
                  <p className="text-xs text-[var(--nfc-muted)]">
                    Saison active : <strong>{season?.label ?? 'Saison courante'}</strong>
                  </p>
                </div>
              </div>
              {nfc?.updatedAt && (
                <StatusBadge tone="brand">
                  Mis à jour le {formatDoualaDate(nfc.updatedAt)}
                </StatusBadge>
              )}
            </div>

            <form onSubmit={handleSaveStanding} className="mt-5 space-y-5">
              {/* Résumé calculé en temps réel */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[var(--nfc-input-bg)] p-4 text-center">
                <div>
                  <span className="text-xs text-[var(--nfc-muted)]">Matchs joués (V+N+D)</span>
                  <p className="mt-1 font-heading text-2xl font-bold">{computed.played}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--nfc-muted)]">Points (3V + 1N)</span>
                  <p className="mt-1 font-heading text-2xl font-bold text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
                    {computed.points} pts
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[var(--nfc-muted)]">Différence de buts</span>
                  <p className="mt-1 font-heading text-2xl font-bold">
                    {computed.goalDifference > 0
                      ? `+${computed.goalDifference}`
                      : computed.goalDifference}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Rang / Position" required>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={!canWrite}
                    required
                  />
                </Field>
                <Field label="Victoires (V)" required>
                  <Input
                    type="number"
                    min={0}
                    value={won}
                    onChange={(e) => setWon(e.target.value)}
                    disabled={!canWrite}
                    required
                  />
                </Field>
                <Field label="Matchs nuls (N)" required>
                  <Input
                    type="number"
                    min={0}
                    value={drawn}
                    onChange={(e) => setDrawn(e.target.value)}
                    disabled={!canWrite}
                    required
                  />
                </Field>
                <Field label="Défaites (D)" required>
                  <Input
                    type="number"
                    min={0}
                    value={lost}
                    onChange={(e) => setLost(e.target.value)}
                    disabled={!canWrite}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Buts marqués (BP)" required>
                  <Input
                    type="number"
                    min={0}
                    value={goalsFor}
                    onChange={(e) => setGoalsFor(e.target.value)}
                    disabled={!canWrite}
                    required
                  />
                </Field>
                <Field label="Buts encaissés (BC)" required>
                  <Input
                    type="number"
                    min={0}
                    value={goalsAgainst}
                    onChange={(e) => setGoalsAgainst(e.target.value)}
                    disabled={!canWrite}
                    required
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <Field
                  label="Forme récente (5 derniers matchs max)"
                  hint="Format attendu : V-V-N-D-V"
                  error={
                    !isFormValid
                      ? 'Utilisez uniquement V, N ou D séparés par un tiret (5 max).'
                      : undefined
                  }
                >
                  <Input
                    value={formSeries}
                    onChange={(e) => setFormSeries(e.target.value.toUpperCase())}
                    placeholder="V-V-N-D-V"
                    disabled={!canWrite}
                  />
                </Field>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--nfc-muted)]">Ajout rapide :</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => appendFormToken('V')}
                    >
                      + Victoire (V)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => appendFormToken('N')}
                    >
                      + Nul (N)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => appendFormToken('D')}
                    >
                      + Défaite (D)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormSeries('')}
                    >
                      Effacer
                    </Button>
                  </div>
                )}
              </div>

              {canWrite && (
                <div className="flex justify-end border-t border-[var(--nfc-border)] pt-4">
                  <Button type="submit" loading={savingStanding}>
                    <Save className="h-4 w-4" />
                    Enregistrer le classement
                  </Button>
                </div>
              )}
            </form>
          </section>

          {/* Gestion des saisons */}
          <section className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[var(--nfc-green)]" />
                <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
                  Saisons
                </h2>
              </div>
              {canWrite && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setSeasonSheetOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle saison
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              {(seasonsQuery.data ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--nfc-border)] p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-[var(--nfc-muted)]">
                      {item.startYear} – {item.endYear}
                    </p>
                  </div>
                  {item.isCurrent ? (
                    <StatusBadge tone="success">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </StatusBadge>
                  ) : (
                    canWrite && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleSetCurrentSeason(item.id)}
                      >
                        Activer
                      </Button>
                    )
                  )}
                </div>
              ))}
              {seasonsQuery.data?.length === 0 && (
                <p className="text-xs text-[var(--nfc-muted)]">Aucune saison enregistrée.</p>
              )}
            </div>

            {/* Historique des mises à jour */}
            <div className="mt-6 border-t border-[var(--nfc-border)] pt-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--nfc-muted)]" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wide">
                  Historique des modifications
                </h3>
              </div>

              <ul className="mt-3 space-y-2 text-xs">
                {(historyQuery.data ?? []).slice(0, 6).map((h) => (
                  <li
                    key={h.id}
                    className="rounded-xl bg-[var(--nfc-input-bg)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>
                        {h.position}e · {h.points} pts ({h.won}V {h.drawn}N {h.lost}D)
                      </span>
                      <span className="text-[var(--nfc-muted)]">
                        {formatDoualaDate(h.recordedAt, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </li>
                ))}
                {(historyQuery.data ?? []).length === 0 && (
                  <li className="text-[var(--nfc-muted)]">Aucun historique pour le moment.</li>
                )}
              </ul>
            </div>
          </section>
        </div>

        <SheetDialog
          open={seasonSheetOpen}
          onClose={() => setSeasonSheetOpen(false)}
          title="Créer une saison sportive"
        >
          <form onSubmit={handleCreateSeason} className="space-y-4">
            <Field label="Libellé de la saison" required>
              <Input
                value={seasonLabel}
                onChange={(e) => setSeasonLabel(e.target.value)}
                placeholder="Ex: Elite Two 2026-2027"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Année de début" required>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={seasonStartYear}
                  onChange={(e) => setSeasonStartYear(e.target.value)}
                  required
                />
              </Field>
              <Field label="Année de fin" required>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={seasonEndYear}
                  onChange={(e) => setSeasonEndYear(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Switch
              checked={seasonIsCurrent}
              onChange={setSeasonIsCurrent}
              label="Définir comme saison courante du club"
            />
            <div className="flex justify-end gap-2 border-t border-[var(--nfc-border)] pt-4">
              <Button type="button" variant="ghost" onClick={() => setSeasonSheetOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={savingSeason}>
                <Save className="h-4 w-4" />
                Créer la saison
              </Button>
            </div>
          </form>
        </SheetDialog>
      </div>
    </DataState>
  );
}
