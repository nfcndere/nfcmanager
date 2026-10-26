'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/connexion');
    router.refresh();
  }

  return (
    <button className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10" onClick={signOut}>
      Déconnexion
    </button>
  );
}
