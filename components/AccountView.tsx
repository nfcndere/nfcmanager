'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck, UserCheck } from 'lucide-react';
import type { SessionUser } from '@/lib/auth';
import { Button, Field, Input, StatusBadge } from '@/components/ui';
import { useAppContext } from '@/components/providers/AppProviders';
import { AuthDiagPanel } from '@/components/AuthDiagPanel';

export function AccountView({ user }: { user: SessionUser }) {
  const { notify } = useAppContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      notify({ title: 'Les nouveaux mots de passe ne correspondent pas.', tone: 'error' });
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        notify({ title: body.message || 'Impossible de modifier le mot de passe.', tone: 'error' });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify({ title: 'Mot de passe mis à jour avec succès.', tone: 'success' });
    } catch {
      notify({ title: 'Erreur réseau lors du changement de mot de passe.', tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nfc-green)]/15 text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
            <UserCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Profil connecté</h2>
            <p className="text-xs text-[var(--nfc-muted)]">Informations du compte sur nfcwebsite</p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-[var(--nfc-border)] pb-2.5">
            <dt className="text-[var(--nfc-muted)]">Nom</dt>
            <dd className="font-semibold">{user.name || 'Non renseigné'}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--nfc-border)] pb-2.5">
            <dt className="text-[var(--nfc-muted)]">E-mail</dt>
            <dd className="font-mono text-xs font-semibold">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--nfc-border)] pb-2.5">
            <dt className="text-[var(--nfc-muted)]">Rôle</dt>
            <dd>
              <StatusBadge tone="brand">{user.role}</StatusBadge>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--nfc-muted)]">Identifiant</dt>
            <dd className="font-mono text-xs text-[var(--nfc-muted)]">{user.id}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <AuthDiagPanel autoRun={false} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nfc-green)]/15 text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
              Changer mon mot de passe
            </h2>
            <p className="text-xs text-[var(--nfc-muted)]">Minimum 8 caractères</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
          <Field label="Mot de passe actuel" required>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nouveau mot de passe" required>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirmer le nouveau mot de passe" required>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button type="submit" loading={pending}>
            <ShieldCheck className="h-4 w-4" />
            Enregistrer le nouveau mot de passe
          </Button>
        </form>
      </section>
    </div>
  );
}
