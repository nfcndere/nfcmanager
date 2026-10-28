'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, LogIn, ShieldAlert } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';
import { AuthDiagPanel } from '@/components/AuthDiagPanel';

export function LoginForm({
  nextPath = '/dashboard',
  showDiagInitially = false,
}: {
  nextPath?: string;
  showDiagInitially?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDiag, setShowDiag] = useState(showDiagInitially);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? 'Connexion impossible.');
        return;
      }
      const safeTarget = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';
      router.replace(safeTarget);
      router.refresh();
    } catch {
      setMessage('Connexion impossible. Vérifiez votre connexion Internet puis réessayez.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-5" onSubmit={submit}>
        <Field label="Adresse e-mail professionnelle" required>
          <Input
            type="email"
            name="email"
            placeholder="admin@ngaounderefc.com"
            autoComplete="username"
            required
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-semibold text-[var(--nfc-text)]">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <Link
              href="/mot-de-passe/oublie"
              className="text-xs font-semibold text-[var(--nfc-green)] hover:underline dark:text-[var(--nfc-yellow)]"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              className="pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--nfc-muted)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {message && (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-800 dark:text-red-200"
            role="alert"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">{message}</p>
              <button
                type="button"
                onClick={() => setShowDiag(true)}
                className="text-xs font-semibold underline"
              >
                Ouvrir le diagnostic de connexion API
              </button>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={pending}>
          <LogIn className="h-4 w-4" />
          {pending ? 'Vérification en cours…' : 'Se connecter'}
        </Button>
      </form>

      <div className="border-t border-[var(--nfc-divider)] pt-4">
        <button
          type="button"
          onClick={() => setShowDiag((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--nfc-muted)] hover:text-[var(--nfc-text)]"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {showDiag ? 'Masquer le diagnostic technique' : 'Problème de connexion ? Tester la liaison nfcwebsite'}
        </button>

        {showDiag && (
          <div className="mt-3">
            <AuthDiagPanel />
          </div>
        )}
      </div>
    </div>
  );
}
