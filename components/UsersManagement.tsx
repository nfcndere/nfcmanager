'use client';

import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  History,
  KeyRound,
  Plus,
  Save,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import type { AuditLogRecord, UserRecord, UserRole } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  Field,
  Input,
  SegmentedControl,
  Select,
  SheetDialog,
  StatusBadge,
} from '@/components/ui';
import { useAppContext } from '@/components/providers/AppProviders';
import { formatDoualaDate } from '@/lib/format';

export function UsersManagement({
  isAdmin,
  currentUserId,
}: {
  isAdmin: boolean;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const { notify } = useAppContext();

  const [tab, setTab] = useState<'USERS' | 'AUDIT'>('USERS');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');

  const usersQuery = useSiteQuery<UserRecord[]>(['users'], 'users', {
    enabled: isAdmin,
  });
  const auditQuery = useSiteQuery<{
    items: AuditLogRecord[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(
    ['audit', auditEntityFilter],
    auditEntityFilter === 'ALL'
      ? 'audit?page=1&pageSize=50'
      : `audit?page=1&pageSize=50&entity=${encodeURIComponent(auditEntityFilter)}`,
    {
      enabled: isAdmin,
      isEmpty: (data) => (data?.items?.length ?? 0) === 0,
    },
  );

  // Création d'utilisateur
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('EDITOR');
  const [creating, setCreating] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);

  if (!isAdmin) {
    return (
      <DataState
        state="forbidden"
        errorMessage="Seuls les administrateurs (rôle ADMIN) peuvent gérer les comptes utilisateurs et consulter le journal d’audit."
      />
    );
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await siteRequest<{
        user: UserRecord;
        temporaryPassword?: string;
      }>('users', {
        method: 'POST',
        body: {
          email: newEmail.trim(),
          name: newName.trim() || null,
          role: newRole,
        },
      });
      setCreateOpen(false);
      setNewEmail('');
      setNewName('');
      if (response.data.temporaryPassword) {
        setCreatedTempPassword({
          email: response.data.user.email,
          password: response.data.temporaryPassword,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['audit'] });
      notify({ title: 'Compte créé avec succès.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Création impossible.',
        tone: 'error',
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(user: UserRecord, role: UserRole) {
    try {
      await siteRequest(`users/${user.id}`, {
        method: 'PATCH',
        body: { role },
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['audit'] });
      notify({ title: `Rôle de ${user.email} changé en ${role}.`, tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Modification impossible.',
        tone: 'error',
      });
    }
  }

  async function handleToggleActive(user: UserRecord) {
    try {
      await siteRequest(`users/${user.id}`, {
        method: 'PATCH',
        body: { active: !user.active },
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['audit'] });
      notify({
        title: user.active ? 'Compte désactivé.' : 'Compte réactivé.',
        tone: 'success',
      });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Action impossible.',
        tone: 'error',
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'USERS', label: 'Comptes utilisateurs', count: usersQuery.data?.length },
            { value: 'AUDIT', label: 'Journal d’audit', count: auditQuery.data?.pagination?.total },
          ]}
        />

        {tab === 'USERS' ? (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
          </Button>
        ) : (
          <Select
            value={auditEntityFilter}
            onChange={(e) => setAuditEntityFilter(e.target.value)}
            className="w-auto min-w-44"
          >
            <option value="ALL">Toutes les entités</option>
            <option value="Match">Matchs</option>
            <option value="Player">Effectif</option>
            <option value="Article">Actualités</option>
            <option value="ClubStanding">Classement</option>
            <option value="Media">Galerie</option>
            <option value="Partner">Sponsors</option>
            <option value="FormSubmission">Inscriptions</option>
            <option value="ClubSetting">Paramètres</option>
            <option value="User">Utilisateurs</option>
          </Select>
        )}
      </div>

      {/* Affichage unique du mot de passe temporaire */}
      {createdTempPassword && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-display text-base font-bold uppercase text-emerald-950 dark:text-emerald-200">
                Mot de passe temporaire généré (affiché une seule fois)
              </p>
              <p className="text-xs text-emerald-900 dark:text-emerald-300">
                Transmettez ce mot de passe à <strong>{createdTempPassword.email}</strong>. Il pourra le modifier dès sa première connexion dans « Mon compte ».
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--nfc-card)] px-3.5 py-2 font-mono text-base font-bold">
                <KeyRound className="h-4 w-4 text-[var(--nfc-green)]" />
                <span>{createdTempPassword.password}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(createdTempPassword.password);
                  notify({ title: 'Mot de passe copié dans le presse-papiers.', tone: 'success' });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setCreatedTempPassword(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'USERS' ? (
        <DataState
          state={usersQuery.state}
          errorMessage={usersQuery.errorMessage}
          updatedAt={usersQuery.updatedAt}
          onRetry={() => void usersQuery.refetch()}
        >
          <div className="grid gap-3.5 md:grid-cols-2">
            {(usersQuery.data ?? []).map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <article
                  key={u.id}
                  className="flex flex-col justify-between nfc-card p-4 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-lg font-bold">
                          {u.name || u.email}
                        </h3>
                        {isSelf && <StatusBadge tone="info">Vous</StatusBadge>}
                      </div>
                      <p className="truncate font-mono text-xs text-[var(--nfc-muted)]">
                        {u.email}
                      </p>
                      <p className="mt-1 text-xs text-[var(--nfc-muted)]">
                        Créé le {formatDoualaDate(u.createdAt, { dateStyle: 'medium' })}
                      </p>
                    </div>

                    <StatusBadge tone={u.active ? 'success' : 'danger'}>
                      {u.active ? 'Actif' : 'Désactivé'}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--nfc-divider)] pt-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[var(--nfc-muted)]" />
                      <Select
                        value={u.role}
                        onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                        disabled={isSelf}
                        className="min-h-9 w-auto py-1 text-xs"
                      >
                        <option value="ADMIN">ADMIN (Accès complet)</option>
                        <option value="EDITOR">EDITOR (Contenu & scores)</option>
                        <option value="USER">USER (Sans accès manager)</option>
                      </Select>
                    </div>

                    {!isSelf && (
                      <Button
                        type="button"
                        size="sm"
                        variant={u.active ? 'ghost' : 'secondary'}
                        onClick={() => void handleToggleActive(u)}
                        className={u.active ? 'text-red-600 dark:text-red-400' : ''}
                      >
                        {u.active ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Réactiver
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </DataState>
      ) : (
        <DataState
          state={auditQuery.state}
          errorMessage={auditQuery.errorMessage}
          updatedAt={auditQuery.updatedAt}
          onRetry={() => void auditQuery.refetch()}
          emptyTitle="Aucune entrée dans le journal d’audit"
          emptyDescription="Toutes les créations, modifications et suppressions effectuées par l’équipe seront tracées ici."
        >
          <div className="space-y-2.5">
            {(auditQuery.data?.items ?? []).map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 nfc-card px-4 py-3 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <History className="h-4 w-4 shrink-0 text-[var(--nfc-green)]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="brand">{log.entity}</StatusBadge>
                      <span className="font-mono font-bold">{log.action}</span>
                      {log.entityId && (
                        <span className="font-mono text-xs text-[var(--nfc-muted)]">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">
                      Par <strong>{log.actorEmail || 'Système'}</strong> ({log.actorRole || '—'})
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[var(--nfc-muted)]">
                  {formatDoualaDate(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </DataState>
      )}

      <SheetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer un compte collaborateur"
        description="Un mot de passe temporaire sécurisé sera généré automatiquement."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Field label="Nom complet" required>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Amadou Bello"
              required
            />
          </Field>
          <Field label="Adresse e-mail" required>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="amadou@ngaounderefc.com"
              required
            />
          </Field>
          <Field label="Rôle d’administration" required>
            <Select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <option value="EDITOR">EDITOR — Gestion des matchs, effectif, actualités, médias</option>
              <option value="ADMIN">ADMIN — Accès complet (paramètres, comptes, audit)</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 border-t border-[var(--nfc-divider)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={creating}>
              <Save className="h-4 w-4" />
              Créer le compte
            </Button>
          </div>
        </form>
      </SheetDialog>
    </div>
  );
}
