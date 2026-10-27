'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, ShieldAlert } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setDoneMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        data?: { message?: string };
      };
      if (!response.ok) {
        setError(body.message || 'Impossible d’envoyer la demande.');
        return;
      }
      setDoneMessage(
        body.data?.message ||
          body.message ||
          'Si ce compte existe, un lien de réinitialisation a été envoyé par e-mail.',
      );
    } catch {
      setError('Connexion réseau impossible.');
    } finally {
      setPending(false);
    }
  }

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
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-sm text-[var(--nfc-muted)]">
          Saisissez votre adresse e-mail professionnelle. Si un compte existe, vous recevrez un lien de réinitialisation.
        </p>

        {doneMessage ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{doneMessage}</p>
            </div>
            <Link
              href="/mot-de-passe/reinitialiser"
              className="block text-center text-xs font-semibold text-[var(--nfc-green)] underline dark:text-[var(--nfc-yellow)]"
            >
              Vous avez déjà un code / jeton ? Saisir le jeton
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Adresse e-mail" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ngaounderefc.com"
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
              <Mail className="h-4 w-4" />
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
