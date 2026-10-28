'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Edit3, Film, Folder, Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import type { MediaRecord, PlayerRecord } from '@/lib/api/schemas';
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
} from '@/components/ui';
import { MediaUploader } from '@/components/MediaUploader';
import { useAppContext } from '@/components/providers/AppProviders';
import { formatDoualaDate } from '@/lib/format';

export function GalleryManagement({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useAppContext();

  const mediaQuery = useSiteQuery<MediaRecord[]>(['galerie'], 'galerie');
  const playersQuery = useSiteQuery<PlayerRecord[]>(['players'], 'players');

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL');
  const [albumFilter, setAlbumFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  // Édition de média
  const [editingMedia, setEditingMedia] = useState<MediaRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editPlayerId, setEditPlayerId] = useState('');
  const [saving, setSaving] = useState(false);

  // Suppression
  const [deletingMedia, setDeletingMedia] = useState<MediaRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const items = useMemo(() => mediaQuery.data ?? [], [mediaQuery.data]);
  const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data]);

  const albums = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.album) set.add(item.album);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((m) => (typeFilter === 'ALL' ? true : m.type === typeFilter))
      .filter((m) => (albumFilter === 'ALL' ? true : m.album === albumFilter))
      .filter((m) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (m.title ?? '').toLowerCase().includes(q) ||
          (m.album ?? '').toLowerCase().includes(q)
        );
      });
  }, [items, typeFilter, albumFilter, search]);

  const openEdit = (media: MediaRecord) => {
    setEditingMedia(media);
    setEditTitle(media.title ?? '');
    setEditAlbum(media.album ?? '');
    setEditPlayerId(media.playerId ?? '');
  };

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingMedia || !canWrite) return;
    setSaving(true);
    try {
      await siteRequest(`galerie/${editingMedia.id}`, {
        method: 'PATCH',
        body: {
          title: editTitle.trim() || null,
          album: editAlbum.trim() || null,
          playerId: editPlayerId || null,
        },
      });
      setEditingMedia(null);
      await queryClient.invalidateQueries({ queryKey: ['galerie'] });
      notify({ title: 'Média mis à jour.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Modification impossible.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingMedia) return;
    setDeletePending(true);
    try {
      await siteRequest(`galerie/${deletingMedia.id}`, { method: 'DELETE' });
      setDeletingMedia(null);
      await queryClient.invalidateQueries({ queryKey: ['galerie'] });
      notify({ title: 'Média supprimé de la galerie.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible de supprimer ce média (il est peut-être utilisé comme photo de joueur ou couverture).',
        tone: 'error',
      });
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'ALL', label: 'Tous', count: items.length },
              {
                value: 'PHOTO',
                label: 'Photos',
                count: items.filter((m) => m.type === 'PHOTO').length,
              },
              {
                value: 'VIDEO',
                label: 'Vidéos',
                count: items.filter((m) => m.type === 'VIDEO').length,
              },
            ]}
          />

          {albums.length > 0 && (
            <Select
              value={albumFilter}
              onChange={(e) => setAlbumFilter(e.target.value)}
              className="w-auto min-w-36"
            >
              <option value="ALL">Tous les albums</option>
              {albums.map((alb) => (
                <option key={alb} value={alb}>
                  Album : {alb}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Titre, album…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          {canWrite && (
            <Button type="button" onClick={() => setUploadSheetOpen(true)}>
              <Plus className="h-4 w-4" />
              Téléverser
            </Button>
          )}
        </div>
      </div>

      <DataState
        state={mediaQuery.state}
        errorMessage={mediaQuery.errorMessage}
        updatedAt={mediaQuery.updatedAt}
        onRetry={() => void mediaQuery.refetch()}
        emptyTitle="Aucun média dans la galerie"
        emptyDescription="Téléversez des photos de matchs, portraits de joueurs ou vidéos d’entraînement."
        emptyAction={
          canWrite ? (
            <Button type="button" onClick={() => setUploadSheetOpen(true)}>
              <Plus className="h-4 w-4" />
              Ajouter un premier média
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((media) => (
            <article
              key={media.id}
              className="group flex flex-col justify-between overflow-hidden nfc-card shadow-2xs"
            >
              <div className="relative aspect-square overflow-hidden bg-[var(--nfc-input-bg)]">
                {media.type === 'VIDEO' ? (
                  <video
                    src={media.url}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.url}
                    alt={media.title || 'Média NFC'}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute left-2 top-2">
                  <StatusBadge tone={media.type === 'VIDEO' ? 'info' : 'neutral'}>
                    {media.type === 'VIDEO' ? (
                      <Film className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    {media.type}
                  </StatusBadge>
                </div>
              </div>

              <div className="p-3">
                <p className="truncate text-sm font-semibold">
                  {media.title || 'Sans titre'}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--nfc-muted)]">
                  <span className="inline-flex items-center gap-1 truncate">
                    <Folder className="h-3 w-3 shrink-0" />
                    {media.album || 'Général'}
                  </span>
                  <span>{formatDoualaDate(media.createdAt, { dateStyle: 'short' })}</span>
                </div>

                {canWrite && (
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--nfc-divider)] pt-2.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(media)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Détails
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingMedia(media)}
                      className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </DataState>

      <SheetDialog
        open={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
        title="Téléverser un média vers Cloudinary"
        description="Les images sont automatiquement compressées sur votre téléphone avant envoi."
      >
        <MediaUploader
          onUploaded={() => {
            setUploadSheetOpen(false);
            void queryClient.invalidateQueries({ queryKey: ['galerie'] });
          }}
        />
      </SheetDialog>

      <SheetDialog
        open={Boolean(editingMedia)}
        onClose={() => setEditingMedia(null)}
        title="Modifier les informations du média"
      >
        {editingMedia && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-xl bg-[var(--nfc-input-bg)]">
              {editingMedia.type === 'VIDEO' ? (
                <video src={editingMedia.url} controls className="h-full w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editingMedia.url}
                  alt={editingMedia.title || 'Média'}
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            <Field label="Titre / Légende">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Ex: Célébration après le 2e but"
              />
            </Field>

            <Field label="Album">
              <Input
                value={editAlbum}
                onChange={(e) => setEditAlbum(e.target.value)}
                placeholder="Matchs, Entraînement, Académie, Sponsors…"
              />
            </Field>

            <Field label="Associer à un joueur (optionnel)">
              <Select value={editPlayerId} onChange={(e) => setEditPlayerId(e.target.value)}>
                <option value="">Aucun joueur spécifique</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.number ? `(#${p.number})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex justify-end gap-2 border-t border-[var(--nfc-divider)] pt-4">
              <Button type="button" variant="ghost" onClick={() => setEditingMedia(null)}>
                Annuler
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </SheetDialog>

      <ConfirmDialog
        open={Boolean(deletingMedia)}
        onClose={() => setDeletingMedia(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletePending}
        title="Supprimer ce média ?"
        description="Le fichier sera supprimé de la galerie et de Cloudinary."
        confirmLabel="Supprimer définitivement"
      />
    </div>
  );
}
