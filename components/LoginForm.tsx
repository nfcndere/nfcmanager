'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? 'Connexion impossible.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setMessage('Connexion impossible. Vérifiez votre réseau puis réessayez.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="block text-sm font-semibold">
        Adresse e-mail
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 px-3 font-normal focus:border-nfc-green focus:outline-none focus:ring-2 focus:ring-nfc-green/20"
          type="email"
          name="email"
          autoComplete="username"
          required
        />
      </label>
      <label className="block text-sm font-semibold">
        Mot de passe
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 px-3 font-normal focus:border-nfc-green focus:outline-none focus:ring-2 focus:ring-nfc-green/20"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>
      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p>}
      <button
        className="min-h-12 w-full rounded-lg bg-nfc-green px-4 font-bold text-white hover:bg-nfc-dark disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
