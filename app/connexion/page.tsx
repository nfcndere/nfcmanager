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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--nfc-bg)] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo officiel Ngaoundéré FC"
            className="h-16 w-16 rounded-full object-contain shadow-xs"
          />
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-[var(--nfc-text)]">
            Administration Ngaoundéré FC
          </h1>
          <p className="mt-1 text-[13px] text-[var(--nfc-muted)]">
            Connectez-vous pour gérer le site officiel du club
          </p>
        </div>

        {sessionExpired && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"
            role="status"
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Votre session a expiré. Reconnectez-vous pour reprendre votre travail.</span>
          </div>
        )}

        {apiUnavailable && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"
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
