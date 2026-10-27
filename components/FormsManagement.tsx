'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Download,
  Edit3,
  Mail,
  MessageCircle,
  Phone,
  Save,
  Trash2,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { ApiClientError, siteRequest } from '@/lib/api/client';
import {
  ACADEMY_FOLLOW_UP_STATUSES,
  type AcademyFollowUpStatus,
  type FormSubmissionRecord,
  type FormType,
} from '@/lib/api/schemas';
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
import { useAppContext } from '@/components/providers/AppProviders';
import { enqueueMutation } from '@/lib/offline-queue';
import { formatDoualaDate } from '@/lib/format';

const FOLLOW_UP_LABELS: Record<AcademyFollowUpStatus, string> = {
  NOUVEAU: 'Nouveau',
  CONTACTE: 'Contacté',
  CONVOQUE: 'Convoqué',
  ADMIS: 'Admis',
  REFUSE: 'Refusé',
};

const FOLLOW_UP_TONES: Record<
  AcademyFollowUpStatus,
  'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'
> = {
  NOUVEAU: 'info',
  CONTACTE: 'warning',
  CONVOQUE: 'brand',
  ADMIS: 'success',
  REFUSE: 'danger',
};

const PAYLOAD_LABELS: Record<string, string> = {
  fullName: 'Nom complet',
  name: 'Nom',
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  whatsapp: 'WhatsApp',
  birthDate: 'Date de naissance',
  age: 'Âge',
  position: 'Poste souhaité',
  preferredPosition: 'Poste souhaité',
  city: 'Ville / Quartier',
  parentName: 'Parent / Tuteur',
  parentPhone: 'Tél. parent',
  subject: 'Objet',
  message: 'Message',
  motivation: 'Motivation',
  matchId: 'Match',
  quantity: 'Places demandées',
  category: 'Catégorie',
};

function extractPhone(payload: Record<string, unknown>): string | null {
  const raw =
    payload.phone ?? payload.whatsapp ?? payload.parentPhone ?? payload.telephone ?? null;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim();
}

function extractName(payload: Record<string, unknown>): string {
  if (typeof payload.fullName === 'string' && payload.fullName.trim()) return payload.fullName;
  if (typeof payload.name === 'string' && payload.name.trim()) return payload.name;
  const first = typeof payload.firstName === 'string' ? payload.firstName : '';
  const last = typeof payload.lastName === 'string' ? payload.lastName : '';
  const combined = `${first} ${last}`.trim();
  return combined || 'Candidat / Visiteur';
}

function FormsManagementInner({ canWrite }: { canWrite: boolean }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { online, notify, refreshOfflineQueue } = useAppContext();

  const formsQuery = useSiteQuery<FormSubmissionRecord[]>(['forms', 'all'], 'forms');

  const [typeFilter, setTypeFilter] = useState<'ALL' | FormType>(() => {
    const requestedType = searchParams.get('type');
    if (
      requestedType === 'ACADEMIE' ||
      requestedType === 'CONTACT' ||
      requestedType === 'BILLETTERIE'
    ) {
      return requestedType;
    }
    return 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPROCESSED' | 'PROCESSED'>('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | AcademyFollowUpStatus>('ALL');
  const [search, setSearch] = useState('');

  const [selectedForm, setSelectedForm] = useState<FormSubmissionRecord | null>(null);
  const [editProcessed, setEditProcessed] = useState(false);
  const [editFollowUp, setEditFollowUp] = useState<AcademyFollowUpStatus>('NOUVEAU');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [deletingForm, setDeletingForm] = useState<FormSubmissionRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const submissions = useMemo(() => formsQuery.data ?? [], [formsQuery.data]);

  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((s) => (typeFilter === 'ALL' ? true : s.type === typeFilter))
      .filter((s) => {
        if (statusFilter === 'UNPROCESSED') return !s.processed;
        if (statusFilter === 'PROCESSED') return s.processed;
        return true;
      })
      .filter((s) => {
        if (followUpFilter === 'ALL') return true;
        return (s.followUpStatus ?? 'NOUVEAU') === followUpFilter;
      })
      .filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return JSON.stringify(s.payload).toLowerCase().includes(q) || (s.adminNotes ?? '').toLowerCase().includes(q);
      });
  }, [submissions, typeFilter, statusFilter, followUpFilter, search]);

  const openDetail = (item: FormSubmissionRecord) => {
    setSelectedForm(item);
    setEditProcessed(item.processed);
    setEditFollowUp((item.followUpStatus as AcademyFollowUpStatus) || 'NOUVEAU');
    setEditNotes(item.adminNotes ?? '');
  };

  async function handleSaveFollowUp(event: FormEvent) {
    event.preventDefault();
    if (!selectedForm || !canWrite) return;
    setSaving(true);

    const payload = {
      processed: editProcessed,
      followUpStatus: editFollowUp,
      adminNotes: editNotes.trim() || null,
    };

    const queueOffline = async () => {
      await enqueueMutation({
        type: 'form_note',
        label: `Suivi dossier ${extractName(selectedForm.payload)}`,
        endpoint: `forms/${selectedForm.id}`,
        method: 'PATCH',
        payload,
      });
      await refreshOfflineQueue();
      setSelectedForm(null);
      notify({
        title: 'Suivi enregistré hors ligne',
        description: 'Il sera synchronisé dès que la connexion sera rétablie.',
        tone: 'warning',
      });
    };

    if (!online) {
      await queueOffline();
      setSaving(false);
      return;
    }

    try {
      await siteRequest(`forms/${selectedForm.id}`, {
        method: 'PATCH',
        body: payload,
      });
      setSelectedForm(null);
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      notify({ title: 'Dossier mis à jour.', tone: 'success' });
    } catch (error) {
      if (error instanceof ApiClientError && error.kind === 'offline') {
        await queueOffline();
      } else {
        notify({
          title: error instanceof Error ? error.message : 'Enregistrement impossible.',
          tone: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingForm) return;
    setDeletePending(true);
    try {
      await siteRequest(`forms/${deletingForm.id}`, { method: 'DELETE' });
      setDeletingForm(null);
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      notify({ title: 'Demande supprimée.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Suppression impossible.',
        tone: 'error',
      });
    } finally {
      setDeletePending(false);
    }
  }

  function exportCsv() {
    if (filteredSubmissions.length === 0) return;
    const headers = [
      'ID',
      'Type',
      'Date',
      'Nom',
      'Téléphone',
      'Email',
      'Statut suivi',
      'Traité',
      'Notes admin',
      'Détails JSON',
    ];
    const rows = filteredSubmissions.map((item) => {
      const p = item.payload ?? {};
      const cells = [
        item.id,
        item.type,
        item.createdAt,
        extractName(p),
        extractPhone(p) ?? '',
        typeof p.email === 'string' ? p.email : '',
        item.followUpStatus ?? 'NOUVEAU',
        item.processed ? 'OUI' : 'NON',
        item.adminNotes ?? '',
        JSON.stringify(p),
      ];
      return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nfc-inscriptions-${typeFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'ALL', label: 'Tous', count: submissions.length },
              {
                value: 'ACADEMIE',
                label: 'Académie',
                count: submissions.filter((s) => s.type === 'ACADEMIE').length,
              },
              {
                value: 'CONTACT',
                label: 'Contact',
                count: submissions.filter((s) => s.type === 'CONTACT').length,
              },
              {
                value: 'BILLETTERIE',
                label: 'Billetterie',
                count: submissions.filter((s) => s.type === 'BILLETTERIE').length,
              },
            ]}
          />

          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'Tous' },
              { value: 'UNPROCESSED', label: 'À traiter' },
              { value: 'PROCESSED', label: 'Traités' },
            ]}
          />

          <Select
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value as 'ALL' | AcademyFollowUpStatus)}
            className="w-auto min-w-36"
          >
            <option value="ALL">Tous les statuts</option>
            {ACADEMY_FOLLOW_UP_STATUSES.map((st) => (
              <option key={st} value={st}>
                {FOLLOW_UP_LABELS[st]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Nom, téléphone, poste…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-52"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={exportCsv}
            disabled={filteredSubmissions.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <DataState
        state={formsQuery.state}
        errorMessage={formsQuery.errorMessage}
        updatedAt={formsQuery.updatedAt}
        onRetry={() => void formsQuery.refetch()}
        emptyTitle="Aucune demande reçue"
        emptyDescription="Les inscriptions à l’Académie, messages de contact et réservations de billetterie apparaîtront ici."
      >
        <div className="grid gap-3.5 md:grid-cols-2">
          {filteredSubmissions.map((item) => {
            const payload = item.payload ?? {};
            const name = extractName(payload);
            const phone = extractPhone(payload);
            const email = typeof payload.email === 'string' ? payload.email : null;
            const followUp = (item.followUpStatus as AcademyFollowUpStatus) || 'NOUVEAU';
            const cleanWaPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-4 shadow-2xs"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge tone="brand">{item.type}</StatusBadge>
                      <StatusBadge tone={FOLLOW_UP_TONES[followUp]}>
                        {FOLLOW_UP_LABELS[followUp]}
                      </StatusBadge>
                    </div>
                    <StatusBadge tone={item.processed ? 'success' : 'warning'}>
                      {item.processed ? 'Traité' : 'À traiter'}
                    </StatusBadge>
                  </div>

                  <h3 className="mt-2.5 font-heading text-lg font-bold">{name}</h3>
                  <p className="text-xs text-[var(--nfc-muted)]">
                    Reçu le {formatDoualaDate(item.createdAt)}
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-[var(--nfc-input-bg)] p-3 text-xs">
                    {Object.entries(payload)
                      .filter(([k, v]) => v !== null && v !== '' && k !== 'fullName' && k !== 'name')
                      .slice(0, 6)
                      .map(([key, val]) => (
                        <div key={key} className="min-w-0">
                          <dt className="text-[var(--nfc-muted)]">
                            {PAYLOAD_LABELS[key] || key}
                          </dt>
                          <dd className="truncate font-semibold">{String(val)}</dd>
                        </div>
                      ))}
                  </dl>

                  {item.adminNotes && (
                    <p className="mt-2.5 rounded-xl border border-[var(--nfc-border)] px-3 py-2 text-xs text-[var(--nfc-muted)]">
                      <strong>Note :</strong> {item.adminNotes}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--nfc-border)] pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--nfc-border)] px-3 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Phone className="h-3.5 w-3.5 text-[var(--nfc-green)]" />
                        Appeler
                      </a>
                    )}
                    {cleanWaPhone && (
                      <a
                        href={`https://wa.me/${cleanWaPhone.startsWith('237') ? cleanWaPhone : `237${cleanWaPhone}`}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--nfc-border)] px-3 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        E-mail
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openDetail(item)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Suivi
                    </Button>
                    {canWrite && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingForm(item)}
                        className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DataState>

      <SheetDialog
        open={Boolean(selectedForm)}
        onClose={() => setSelectedForm(null)}
        title={selectedForm ? `Dossier : ${extractName(selectedForm.payload)}` : 'Suivi du dossier'}
        description="Mettez à jour le statut de recrutement / traitement et ajoutez vos notes internes."
      >
        {selectedForm && (
          <form onSubmit={handleSaveFollowUp} className="space-y-4">
            <div className="rounded-2xl bg-[var(--nfc-input-bg)] p-4 text-xs">
              <p className="mb-2 font-bold uppercase tracking-wider text-[var(--nfc-muted)]">
                Informations transmises ({selectedForm.type})
              </p>
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(selectedForm.payload).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[var(--nfc-muted)]">{PAYLOAD_LABELS[key] || key}</dt>
                    <dd className="font-semibold break-words">{String(value ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Field label="Étape de suivi (Académie / Contact)">
              <Select
                value={editFollowUp}
                onChange={(e) => setEditFollowUp(e.target.value as AcademyFollowUpStatus)}
                disabled={!canWrite}
              >
                {ACADEMY_FOLLOW_UP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {FOLLOW_UP_LABELS[st]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Notes internes de suivi (entraîneurs / secrétariat)">
              <Textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ex: Joueur convoqué pour la détection de samedi à 8h00..."
                disabled={!canWrite}
              />
            </Field>

            <Switch
              checked={editProcessed}
              onChange={setEditProcessed}
              disabled={!canWrite}
              label="Marquer ce dossier comme traité"
              description="Le retire du compteur des demandes en attente sur le tableau de bord."
            />

            {canWrite && (
              <div className="flex justify-end gap-2 border-t border-[var(--nfc-border)] pt-4">
                <Button type="button" variant="ghost" onClick={() => setSelectedForm(null)}>
                  Fermer
                </Button>
                <Button type="submit" loading={saving}>
                  <CheckCircle2 className="h-4 w-4" />
                  <Save className="h-4 w-4" />
                  Enregistrer le suivi
                </Button>
              </div>
            )}
          </form>
        )}
      </SheetDialog>

      <ConfirmDialog
        open={Boolean(deletingForm)}
        onClose={() => setDeletingForm(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletePending}
        title="Supprimer cette demande ?"
        description="Cette soumission de formulaire sera supprimée définitivement."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

export function FormsManagement({ canWrite }: { canWrite: boolean }) {
  return (
    <Suspense fallback={<DataState state="loading" />}>
      <FormsManagementInner canWrite={canWrite} />
    </Suspense>
  );
}
