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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--nfc-bg)] px-4 py-8">
      <section className="w-full max-w-sm nfc-card p-6 sm:p-7 shadow-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo officiel Ngaoundéré FC"
            className="h-12 w-12 object-contain"
          />
          <h1 className="mt-3 text-base font-semibold text-[var(--nfc-text)]">
            Administration Ngaoundéré FC
          </h1>
          <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">
            Connectez-vous pour gérer le club
          </p>
        </div>

        {sessionExpired && (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 border-l-2 border-amber-500"
            role="status"
          >
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>Votre session a expiré. Reconnectez-vous.</span>
          </div>
        )}

        {apiUnavailable && (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 border-l-2 border-amber-500"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              Le serveur ne répond pas ou attend une migration de base de données.
            </span>
          </div>
        )}

        <LoginForm nextPath={nextPath} showDiagInitially={showDiag} />
      </section>
    </main>
  );
}
