'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  ExternalLink,
  Handshake,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import type { MediaRecord, PartnerRecord } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  SheetDialog,
  StatusBadge,
  Switch,
} from '@/components/ui';
import { MediaPicker } from '@/components/MediaUploader';
import { useAppContext } from '@/components/providers/AppProviders';

export function PartnerManagement({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useAppContext();

  const partnersQuery = useSiteQuery<PartnerRecord[]>(['partners'], 'partners?all=1');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [priority, setPriority] = useState('0');
  const [active, setActive] = useState(true);
  const [logoId, setLogoId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState('');

  const [deletingPartner, setDeletingPartner] = useState<PartnerRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const partners = useMemo(() => {
    return (partnersQuery.data ?? []).slice().sort((a, b) => a.priority - b.priority);
  }, [partnersQuery.data]);

  const openCreate = () => {
    setEditingPartner(null);
    setName('');
    setWebsite('');
    setPriority(String(partners.length + 1));
    setActive(true);
    setLogoId(null);
    setLogoUrl('');
    setSheetOpen(true);
  };

  const openEdit = (partner: PartnerRecord) => {
    setEditingPartner(partner);
    setName(partner.name);
    setWebsite(partner.website ?? '');
    setPriority(String(partner.priority ?? 0));
    setActive(partner.active !== false);
    setLogoId(partner.logoId ?? null);
    setLogoUrl(partner.logoUrl ?? '');
    setSheetOpen(true);
  };

  async function handleSavePartner(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      website: website.trim() || null,
      priority: Math.max(0, Number(priority) || 0),
      active,
      logoId: logoId || null,
      logoUrl: logoUrl.trim() || null,
    };

    try {
      if (editingPartner) {
        await siteRequest(`partners/${editingPartner.id}`, {
          method: 'PATCH',
          body: payload,
        });
        notify({ title: 'Partenaire mis à jour.', tone: 'success' });
      } else {
        await siteRequest('partners', {
          method: 'POST',
          body: payload,
        });
        notify({ title: 'Nouveau partenaire ajouté.', tone: 'success' });
      }
      setSheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Enregistrement impossible.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleMovePriority(partner: PartnerRecord, direction: -1 | 1) {
    if (!canWrite) return;
    const nextPriority = Math.max(0, (partner.priority ?? 0) + direction);
    try {
      await siteRequest(`partners/${partner.id}`, {
        method: 'PATCH',
        body: { priority: nextPriority },
      });
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible de modifier l’ordre.',
        tone: 'error',
      });
    }
  }

  async function handleToggleActive(partner: PartnerRecord) {
    if (!canWrite) return;
    try {
      await siteRequest(`partners/${partner.id}`, {
        method: 'PATCH',
        body: { active: !(partner.active !== false) },
      });
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
      notify({
        title: partner.active !== false ? 'Partenaire masqué du site.' : 'Partenaire activé sur le site.',
        tone: 'success',
      });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Modification impossible.',
        tone: 'error',
      });
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingPartner) return;
    setDeletePending(true);
    try {
      await siteRequest(`partners/${deletingPartner.id}`, { method: 'DELETE' });
      setDeletingPartner(null);
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
      notify({ title: 'Partenaire supprimé.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Suppression impossible.',
        tone: 'error',
      });
    } finally {
      setDeletePending(false);
    }
  }

  const handleSelectLogo = (media: MediaRecord) => {
    setLogoId(media.id);
    setLogoUrl(media.url);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--nfc-muted)]">
          Les partenaires actifs s’affichent par ordre de priorité croissant sur la page d’accueil.
        </p>
        {canWrite && (
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un sponsor
          </Button>
        )}
      </div>

      <DataState
        state={partnersQuery.state}
        errorMessage={partnersQuery.errorMessage}
        updatedAt={partnersQuery.updatedAt}
        onRetry={() => void partnersQuery.refetch()}
        emptyTitle="Aucun sponsor enregistré"
        emptyDescription="Ajoutez les partenaires officiels du Ngaoundéré FC avec leur logo et leur site web."
        emptyAction={
          canWrite ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Ajouter un sponsor
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <article
              key={partner.id}
              className="flex flex-col justify-between nfc-card p-4 shadow-2xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--nfc-divider)] bg-white p-2">
                  {partner.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Handshake className="h-7 w-7 text-gray-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-display text-lg font-bold">{partner.name}</h3>
                    <StatusBadge tone={partner.active !== false ? 'success' : 'neutral'}>
                      {partner.active !== false ? 'Actif' : 'Inactif'}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">
                    Priorité d’affichage : <strong>{partner.priority}</strong>
                  </p>
                  {partner.website && (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--nfc-green)] hover:underline dark:text-[var(--nfc-yellow)]"
                    >
                      Site web
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {canWrite && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--nfc-divider)] pt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleMovePriority(partner, -1)}
                      aria-label="Monter la priorité"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleMovePriority(partner, 1)}
                      aria-label="Descendre la priorité"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleToggleActive(partner)}
                    >
                      {partner.active !== false ? 'Masquer' : 'Activer'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(partner)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingPartner(partner)}
                      className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </DataState>

      <SheetDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingPartner ? 'Modifier le partenaire' : 'Ajouter un partenaire'}
      >
        <form onSubmit={handleSavePartner} className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--nfc-divider)] bg-[var(--nfc-input-bg)] p-3.5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <Handshake className="h-7 w-7 text-gray-400" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Logo du sponsor</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Choisir depuis la galerie / Téléverser
              </Button>
            </div>
          </div>

          <Field label="Nom du partenaire / sponsor" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Camrail"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site web (URL)">
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field label="Ordre de priorité (0 = premier)">
              <Input
                type="number"
                min={0}
                max={999}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </Field>
          </div>

          <Switch
            checked={active}
            onChange={setActive}
            label="Afficher ce partenaire sur le site public"
          />

          <div className="flex justify-end gap-2 border-t border-[var(--nfc-divider)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </form>
      </SheetDialog>

      <SheetDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Sélectionner le logo du partenaire"
      >
        <MediaPicker selectedId={logoId} onSelect={handleSelectLogo} filterType="PHOTO" />
      </SheetDialog>

      <ConfirmDialog
        open={Boolean(deletingPartner)}
        onClose={() => setDeletingPartner(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletePending}
        title="Supprimer ce partenaire ?"
        description={
          deletingPartner
            ? `Le partenaire « ${deletingPartner.name} » sera retiré définitivement.`
            : ''
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}
