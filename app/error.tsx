'use client';

import { useEffect } from 'react';

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Erreur dans NFC Admin:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-5 py-24">
      <section className="rounded-2xl bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-bold">Données temporairement indisponibles</h1>
        <p className="mt-3 text-gray-700">Impossible de communiquer avec les services requis. Vérifiez la connexion et réessayez.</p>
        {error.digest && <p className="mt-2 text-sm text-gray-500">Référence : {error.digest}</p>}
        <button className="mt-6 min-h-12 rounded-lg bg-nfc-green px-5 font-bold text-white" onClick={() => reset()}>Réessayer</button>
      </section>
    </main>
  );
}
