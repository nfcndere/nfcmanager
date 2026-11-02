import Link from 'next/link';
import { Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-12 antialiased">
      <section className="w-full max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-none">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-[var(--text)]">
          Page introuvable (404)
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
          La page demandée n’existe pas ou a été déplacée dans le cadre de la réorganisation.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/dashboard">
            <Button variant="primary" size="md">
              <Home className="h-3.5 w-3.5" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
