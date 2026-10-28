'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Edit3,
  Image as ImageIcon,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import { PLAYER_POSITIONS, type MediaRecord, type PlayerPosition, type PlayerRecord } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  SegmentedControl,
  Select,
  SheetDialog,
  StatusBadge,
  Switch,
  Textarea,
} from '@/components/ui';
import { MediaPicker } from '@/components/MediaUploader';
import { useAppContext } from '@/components/providers/AppProviders';
import { toDoualaDateInputValue } from '@/lib/format';

const POSITION_LABELS: Record<PlayerPosition, string> = {
  GARDIEN: 'Gardien',
  DEFENSEUR: 'Défenseur',
  MILIEU: 'Milieu',
  ATTAQUANT: 'Attaquant',
};

export function PlayerManagement({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useAppContext();

  const playersQuery = useSiteQuery<PlayerRecord[]>(['players'], 'players');
  const [positionFilter, setPositionFilter] = useState<'ALL' | PlayerPosition>('ALL');
  const [search, setSearch] = useState('');

  // État modale création / édition
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Sélecteur de photo
  const [pickerOpen, setPickerOpen] = useState(false);

  // Champs contrôlés
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('MILIEU');
  const [nationality, setNationality] = useState('Cameroun');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [joinedYear, setJoinedYear] = useState('');
  const [bio, setBio] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Statistiques JSON typées
  const [matchesPlayed, setMatchesPlayed] = useState('0');
  const [goalsScored, setGoalsScored] = useState('0');
  const [assists, setAssists] = useState('0');
  const [yellowCards, setYellowCards] = useState('0');
  const [redCards, setRedCards] = useState('0');

  // Suppression
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const openCreate = () => {
    setEditingPlayer(null);
    setFirstName('');
    setLastName('');
    setNumber('');
    setPosition('MILIEU');
    setNationality('Cameroun');
    setBirthDate('');
    setHeight('');
    setWeight('');
    setJoinedYear(String(new Date().getFullYear()));
    setBio('');
    setIsCaptain(false);
    setPhotoId(null);
    setPhotoPreviewUrl(null);
    setMatchesPlayed('0');
    setGoalsScored('0');
    setAssists('0');
    setYellowCards('0');
    setRedCards('0');
    setSheetOpen(true);
  };

  const openEdit = (player: PlayerRecord) => {
    setEditingPlayer(player);
    setFirstName(player.firstName);
    setLastName(player.lastName);
    setNumber(player.number !== null && player.number !== undefined ? String(player.number) : '');
    setPosition(player.position || 'MILIEU');
    setNationality(player.nationality || 'Cameroun');
    setBirthDate(toDoualaDateInputValue(player.birthDate));
    setHeight(player.height !== null && player.height !== undefined ? String(player.height) : '');
    setWeight(player.weight !== null && player.weight !== undefined ? String(player.weight) : '');
    setJoinedYear(player.joinedYear !== null && player.joinedYear !== undefined ? String(player.joinedYear) : '');
    setBio(player.bio ?? '');
    setIsCaptain(Boolean(player.isCaptain));
    setPhotoId(player.photoId ?? null);
    setPhotoPreviewUrl(player.photo?.url ?? null);

    const stats = (player.stats ?? {}) as Record<string, unknown>;
    setMatchesPlayed(String(Number(stats.matchesPlayed ?? 0)));
    setGoalsScored(String(Number(stats.goalsScored ?? 0)));
    setAssists(String(Number(stats.assists ?? 0)));
    setYellowCards(String(Number(stats.yellowCards ?? 0)));
    setRedCards(String(Number(stats.redCards ?? 0)));
    setSheetOpen(true);
  };

  const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => (positionFilter === 'ALL' ? true : p.position === positionFilter))
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          String(p.number ?? '').includes(q) ||
          (p.position ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
  }, [players, positionFilter, search]);

  async function handleSavePlayer(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      number: number === '' ? null : Number(number),
      position: position || null,
      nationality: nationality.trim() || 'Cameroun',
      birthDate: birthDate ? new Date(`${birthDate}T12:00:00Z`).toISOString() : null,
      height: height === '' ? null : Number(height),
      weight: weight === '' ? null : Number(weight),
      joinedYear: joinedYear === '' ? null : Number(joinedYear),
      bio: bio.trim() || null,
      isCaptain,
      photoId: photoId || null,
      stats: {
        matchesPlayed: Math.max(0, Number(matchesPlayed) || 0),
        goalsScored: Math.max(0, Number(goalsScored) || 0),
        assists: Math.max(0, Number(assists) || 0),
        yellowCards: Math.max(0, Number(yellowCards) || 0),
        redCards: Math.max(0, Number(redCards) || 0),
      },
    };

    try {
      if (editingPlayer) {
        await siteRequest(`players/${editingPlayer.id}`, {
          method: 'PATCH',
          body: payload,
        });
        notify({ title: 'Fiche joueur mise à jour.', tone: 'success' });
      } else {
        await siteRequest('players', {
          method: 'POST',
          body: payload,
        });
        notify({ title: 'Nouveau joueur ajouté à l’effectif.', tone: 'success' });
      }
      setSheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['players'] });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible d’enregistrer ce joueur.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingPlayer) return;
    const target = deletingPlayer;
    setDeletePending(true);
    try {
      await siteRequest(`players/${target.id}`, { method: 'DELETE' });
      setDeletingPlayer(null);
      await queryClient.invalidateQueries({ queryKey: ['players'] });
      notify({
        title: `Joueur « ${target.firstName} ${target.lastName} » retiré de l’effectif.`,
        tone: 'info',
        actionLabel: 'Annuler (5s)',
        onAction: async () => {
          await siteRequest(`players/${target.id}`, {
            method: 'PATCH',
            body: { restore: true },
          });
          await queryClient.invalidateQueries({ queryKey: ['players'] });
          notify({ title: 'Joueur restauré dans l’effectif.', tone: 'success' });
        },
      });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Suppression impossible.',
        tone: 'error',
      });
    } finally {
      setDeletePending(false);
    }
  }

  const handleSelectPhoto = (media: MediaRecord) => {
    setPhotoId(media.id);
    setPhotoPreviewUrl(media.url);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={positionFilter}
          onChange={setPositionFilter}
          options={[
            { value: 'ALL', label: 'Tous', count: players.length },
            {
              value: 'GARDIEN',
              label: 'Gardiens',
              count: players.filter((p) => p.position === 'GARDIEN').length,
            },
            {
              value: 'DEFENSEUR',
              label: 'Défenseurs',
              count: players.filter((p) => p.position === 'DEFENSEUR').length,
            },
            {
              value: 'MILIEU',
              label: 'Milieux',
              count: players.filter((p) => p.position === 'MILIEU').length,
            },
            {
              value: 'ATTAQUANT',
              label: 'Attaquants',
              count: players.filter((p) => p.position === 'ATTAQUANT').length,
            },
          ]}
        />

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Nom, numéro, poste…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          {canWrite && (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter un joueur
            </Button>
          )}
        </div>
      </div>

      <DataState
        state={playersQuery.state}
        errorMessage={playersQuery.errorMessage}
        updatedAt={playersQuery.updatedAt}
        onRetry={() => void playersQuery.refetch()}
        emptyTitle="Effectif vide"
        emptyDescription="Ajoutez les joueurs du Ngaoundéré FC avec leur numéro, poste, photo et statistiques."
        emptyAction={
          canWrite ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Créer une fiche joueur
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => {
            const stats = (player.stats ?? {}) as Record<string, unknown>;
            return (
              <article
                key={player.id}
                className="flex flex-col justify-between nfc-card p-4 shadow-2xs"
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--nfc-input-bg)]">
                    {player.photo?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={player.photo.url}
                        alt={`${player.firstName} ${player.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--nfc-muted)]">
                        <User className="h-7 w-7" />
                      </div>
                    )}
                    {player.number !== null && player.number !== undefined && (
                      <span className="absolute bottom-1 right-1 rounded-md bg-[var(--nfc-green)] px-1.5 py-0.5 font-display text-xs font-bold text-[var(--nfc-yellow)]">
                        #{player.number}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate font-display text-lg font-bold">
                        {player.firstName} {player.lastName}
                      </h3>
                      {player.isCaptain && (
                        <StatusBadge tone="brand">
                          <Award className="h-3 w-3" />
                          Capitaine
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--nfc-muted)]">
                      {player.position ? POSITION_LABELS[player.position] : 'Poste non défini'} ·{' '}
                      {player.nationality || 'Cameroun'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--nfc-muted)]">
                      <span>MJ: <strong>{Number(stats.matchesPlayed ?? 0)}</strong></span>
                      <span>Buts: <strong>{Number(stats.goalsScored ?? 0)}</strong></span>
                      <span>Passes: <strong>{Number(stats.assists ?? 0)}</strong></span>
                    </div>
                  </div>
                </div>

                {player.bio && (
                  <p className="mt-3 line-clamp-2 text-xs text-[var(--nfc-muted)]">{player.bio}</p>
                )}

                {canWrite && (
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--nfc-divider)] pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(player)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Modifier la fiche
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingPlayer(player)}
                      className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </DataState>

      <SheetDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingPlayer ? `Modifier ${editingPlayer.firstName} ${editingPlayer.lastName}` : 'Ajouter un joueur'}
        description="Renseignez l’état civil, le poste, la photo officielle et les statistiques de saison."
      >
        <form onSubmit={handleSavePlayer} className="space-y-4">
          {/* Photo du joueur */}
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--nfc-divider)] bg-[var(--nfc-input-bg)] p-3.5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--nfc-card)]">
              {photoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreviewUrl} alt="Aperçu joueur" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--nfc-muted)]">
                  <User className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Photo officielle du joueur</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setPickerOpen(true)}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {photoId ? 'Changer de photo' : 'Choisir / Téléverser une photo'}
                </Button>
                {photoId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPhotoId(null);
                      setPhotoPreviewUrl(null);
                    }}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field label="Nom" required>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Numéro de maillot">
              <Input
                type="number"
                min={1}
                max={99}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex: 10"
              />
            </Field>
            <Field label="Poste" required>
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value as PlayerPosition)}
              >
                {PLAYER_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {POSITION_LABELS[pos]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nationalité">
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Date de naissance">
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </Field>
            <Field label="Taille (cm)">
              <Input
                type="number"
                min={120}
                max={230}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="182"
              />
            </Field>
            <Field label="Poids (kg)">
              <Input
                type="number"
                min={40}
                max={130}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="76"
              />
            </Field>
            <Field label="Arrivée au club">
              <Input
                type="number"
                min={1990}
                max={2035}
                value={joinedYear}
                onChange={(e) => setJoinedYear(e.target.value)}
                placeholder="2025"
              />
            </Field>
          </div>

          <Switch
            checked={isCaptain}
            onChange={setIsCaptain}
            label="Capitaine de l’équipe"
            description="Affiche le brassard de capitaine sur la fiche publique du joueur."
          />

          <div className="rounded-2xl border border-[var(--nfc-divider)] bg-[var(--nfc-input-bg)] p-4">
            <h4 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide">
              <Shield className="h-4 w-4 text-[var(--nfc-green)]" />
              Statistiques de la saison
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label="Matchs joués">
                <Input
                  type="number"
                  min={0}
                  value={matchesPlayed}
                  onChange={(e) => setMatchesPlayed(e.target.value)}
                />
              </Field>
              <Field label="Buts">
                <Input
                  type="number"
                  min={0}
                  value={goalsScored}
                  onChange={(e) => setGoalsScored(e.target.value)}
                />
              </Field>
              <Field label="Passes déc.">
                <Input
                  type="number"
                  min={0}
                  value={assists}
                  onChange={(e) => setAssists(e.target.value)}
                />
              </Field>
              <Field label="Cartons J.">
                <Input
                  type="number"
                  min={0}
                  value={yellowCards}
                  onChange={(e) => setYellowCards(e.target.value)}
                />
              </Field>
              <Field label="Cartons R.">
                <Input
                  type="number"
                  min={0}
                  value={redCards}
                  onChange={(e) => setRedCards(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <Field label="Biographie / Profil">
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parcours, qualités sur le terrain, clubs précédents…"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-[var(--nfc-divider)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              {editingPlayer ? 'Enregistrer la fiche' : 'Ajouter le joueur'}
            </Button>
          </div>
        </form>
      </SheetDialog>

      <SheetDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choisir ou téléverser la photo du joueur"
      >
        <MediaPicker
          selectedId={photoId}
          onSelect={handleSelectPhoto}
          filterType="PHOTO"
        />
      </SheetDialog>

      <ConfirmDialog
        open={Boolean(deletingPlayer)}
        onClose={() => setDeletingPlayer(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletePending}
        title="Retirer ce joueur de l’effectif ?"
        description={
          deletingPlayer
            ? `La fiche de « ${deletingPlayer.firstName} ${deletingPlayer.lastName} » sera masquée du site public.`
            : ''
        }
        confirmLabel="Retirer le joueur"
      />
    </div>
  );
}
