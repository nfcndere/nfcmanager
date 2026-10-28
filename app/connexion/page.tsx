import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { getSessionState } from '@/lib/auth';
import { AlertTriangle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    api?: string | string[];
    expired?: string | string[];
    next?: string | string[];
    diag?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const session = await getSessionState();

  const nextPath = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/dashboard';
  if (session.status === 'ok' || session.status === 'authenticated') {
    redirect(nextPath);
  }

  const apiUnavailable =
    session.status === 'unavailable' ||
    session.status === 'api_unavailable' ||
    params.api === 'unavailable';
  const sessionExpired = params.expired === '1';
  const showDiag = params.diag === '1' || apiUnavailable;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[var(--nfc-dark)] px-4 py-12">
      {/* Fond sombre texturé comme les en-têtes du site nfcwebsite */}
      <div className="absolute inset-0 z-0 bg-radial from-[var(--nfc-surface-2)] via-[var(--nfc-dark)] to-black opacity-80" />

      <section className="relative z-10 w-full max-w-md nfc-card border-t-4 border-[var(--nfc-green)] p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo officiel Ngaoundéré FC"
            className="h-16 w-16 object-contain"
          />
          <span className="section-tag mt-3">Espace d'administration</span>
          <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight text-[var(--nfc-text)]">
            NGAOUNDÉRÉ FC
          </h1>
          <p className="mt-1 text-xs text-[var(--nfc-muted)]">
            Connectez-vous pour administrer le site officiel
          </p>
        </div>

        {sessionExpired && (
          <div
            className="mb-5 flex items-start gap-2.5 bg-amber-400 p-3 text-xs font-bold uppercase text-[var(--nfc-dark)] font-display tracking-wider"
            role="status"
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Votre session a expiré. Reconnectez-vous pour reprendre votre travail.</span>
          </div>
        )}

        {apiUnavailable && (
          <div
            className="mb-5 flex items-start gap-2.5 bg-amber-400 p-3 text-xs font-bold uppercase text-[var(--nfc-dark)] font-display tracking-wider"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Le serveur du site officiel ne répond pas ou attend une migration de base de données.
            </span>
          </div>
        )}

        <LoginForm nextPath={nextPath} showDiagInitially={showDiag} />
      </section>
    </main>
  );
}
