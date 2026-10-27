'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(body.message || 'Jeton invalide ou expiré.');
        return;
      }
      setDone(true);
    } catch {
      setError('Connexion réseau impossible.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.</p>
        </div>
        <Link
          href="/connexion"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--nfc-green)] px-4 font-semibold text-white"
        >
          Aller à la page de connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <Field label="Jeton de réinitialisation" required hint="Reçu par e-mail ou fourni par un administrateur">
        <Input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Collez le jeton ici"
          required
        />
      </Field>

      <Field label="Nouveau mot de passe (min. 8 caractères)" required>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </Field>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" loading={pending}>
        <KeyRound className="h-4 w-4" />
        Enregistrer le nouveau mot de passe
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--nfc-bg)] px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-6 shadow-xl sm:p-8">
        <Link
          href="/connexion"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--nfc-muted)] hover:text-[var(--nfc-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>

        <h1 className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide">
          Réinitialiser le mot de passe
        </h1>
        <p className="mt-2 text-sm text-[var(--nfc-muted)]">
          Choisissez un nouveau mot de passe sécurisé d’au moins 8 caractères.
        </p>

        <Suspense fallback={<p className="mt-6 text-sm text-[var(--nfc-muted)]">Chargement…</p>}>
          <ResetPasswordInner />
        </Suspense>
      </section>
    </main>
  );
}
