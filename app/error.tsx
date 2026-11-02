'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

export default function ApplicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur applicative NFC Manager:', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-12 antialiased">
      <section className="w-full max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-none">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-[var(--text)]">
          Une erreur inattendue est survenue
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
          Impossible de charger cette section. Vos données locales saisies restent en sécurité dans le cache hors ligne.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-[var(--text-soft)]">
            Réf. : {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <Button variant="primary" size="md" onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer le chargement
          </Button>
        </div>
      </section>
    </main>
  );
}
