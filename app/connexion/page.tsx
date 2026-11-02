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

  const nextPath =
    typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/dashboard';
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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-10 antialiased">
      <section className="w-full max-w-sm rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 shadow-none">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--accent)] text-white shadow-xs">
            <span className="text-base font-semibold tracking-wide">NFC</span>
          </div>
          <h1 className="mt-3.5 text-base font-semibold tracking-tight text-[var(--text)]">
            Administration Ngaoundéré FC
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Connectez-vous pour piloter le club
          </p>
        </div>

        {sessionExpired && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 text-xs text-[var(--status-warning-text)]"
            role="status"
          >
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Votre session a expiré. Veuillez vous reconnecter.</span>
          </div>
        )}

        {apiUnavailable && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3 text-xs text-[var(--status-warning-text)]"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Le serveur ne répond pas ou est en attente d’une synchronisation de base de données.
            </span>
          </div>
        )}

        <LoginForm nextPath={nextPath} showDiagInitially={showDiag} />
      </section>
    </main>
  );
}
