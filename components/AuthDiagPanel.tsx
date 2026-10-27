'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { Button, StatusBadge } from '@/components/ui';

type DiagResult = {
  timestamp: string;
  siteApiUrl: string;
  managerProtocol: string;
  cookiesSecurePolicy: boolean;
  hasAccessTokenCookie: boolean;
  hasRefreshTokenCookie: boolean;
  checks: {
    health: { ok: boolean; status: number | null; latencyMs: number | null; detail: string };
    loginEndpoint: { ok: boolean; status: number | null; latencyMs: number | null; detail: string };
    refreshEndpoint: { ok: boolean; status: number | null; detail: string };
  };
};

export function AuthDiagPanel({ autoRun = true }: { autoRun?: boolean }) {
  const [diag, setDiag] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiag = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/diag', { cache: 'no-store' });
      const body = (await response.json()) as { status?: string; data?: DiagResult; message?: string };
      if (!response.ok || !body.data) {
        setError(body.message || 'Impossible d’exécuter le diagnostic.');
        return;
      }
      setDiag(body.data);
    } catch {
      setError('Impossible de contacter le serveur nfcmanager pour lancer le diagnostic.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => {
      void runDiag();
    }, 0);
    return () => clearTimeout(timer);
  }, [autoRun, runDiag]);

  return (
    <div className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--nfc-green)]" />
          <h3 className="font-heading text-base font-bold uppercase tracking-wide">
            Diagnostic de connexion API
          </h3>
        </div>
        <Button type="button" size="sm" variant="secondary" loading={loading} onClick={() => void runDiag()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Tester la liaison
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {diag && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 rounded-xl bg-[var(--nfc-input-bg)] p-3 text-xs sm:grid-cols-2">
            <div>
              <span className="text-[var(--nfc-muted)]">Cible API (`NFCWEBSITE_API_URL`) :</span>
              <p className="mt-0.5 font-mono font-semibold break-all">{diag.siteApiUrl}</p>
            </div>
            <div>
              <span className="text-[var(--nfc-muted)]">Protocole & Cookies :</span>
              <p className="mt-0.5 font-semibold">
                {diag.managerProtocol.toUpperCase()} · Secure={diag.cookiesSecurePolicy ? 'oui' : 'non (compatible LAN)'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <DiagRow
              title="Santé API (/api/health)"
              ok={diag.checks.health.ok}
              badge={
                diag.checks.health.status
                  ? `HTTP ${diag.checks.health.status}${diag.checks.health.latencyMs ? ` · ${diag.checks.health.latencyMs} ms` : ''}`
                  : 'Injoignable'
              }
              detail={diag.checks.health.detail}
            />
            <DiagRow
              title="Authentification (/api/auth/login)"
              ok={diag.checks.loginEndpoint.ok}
              badge={
                diag.checks.loginEndpoint.status
                  ? `HTTP ${diag.checks.loginEndpoint.status}${diag.checks.loginEndpoint.latencyMs ? ` · ${diag.checks.loginEndpoint.latencyMs} ms` : ''}`
                  : 'Erreur'
              }
              detail={diag.checks.loginEndpoint.detail}
            />
            <DiagRow
              title="Rafraîchissement (/api/auth/refresh)"
              ok={diag.checks.refreshEndpoint.ok}
              badge={diag.checks.refreshEndpoint.status ? `HTTP ${diag.checks.refreshEndpoint.status}` : 'Erreur'}
              detail={diag.checks.refreshEndpoint.detail}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DiagRow({
  title,
  ok,
  badge,
  detail,
}: {
  title: string;
  ok: boolean;
  badge: string;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--nfc-border)] p-3">
      <div className="flex items-start gap-2.5">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        )}
        <div>
          <p className="font-semibold text-[var(--nfc-text)]">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">{detail}</p>
        </div>
      </div>
      <StatusBadge tone={ok ? 'success' : 'danger'}>{badge}</StatusBadge>
    </div>
  );
}
