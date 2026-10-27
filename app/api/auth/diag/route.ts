import { NextRequest, NextResponse } from 'next/server';
import {
  getAccessToken,
  getRefreshToken,
  getSessionState,
  getSiteApiUrl,
  isSecureRequest,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/diag — Sonde de diagnostic de connexion (étape 0).
 * Accessible en développement, ou en production si `?diag=1` ou pour un ADMIN connecté.
 * Ne renvoie JAMAIS la valeur d'un jeton ni d'un secret.
 */
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const session = await getSessionState();
  const isAdmin = session.user?.role === 'ADMIN';
  const diagQuery = request.nextUrl.searchParams.get('diag') === '1';

  if (!isDev && !isAdmin && !diagQuery) {
    return NextResponse.json({ status: 'error', message: 'Diagnostic réservé au mode développement ou ADMIN.' }, { status: 403 });
  }

  let siteApiUrl = '';
  let configValid = true;
  let configError: string | null = null;
  const rawEnvUrl = process.env.NFCWEBSITE_API_URL?.trim() || '(défaut : https://www.ngaounderefc.cm)';
  const wasNormalizedFromApex = /^https?:\/\/ngaounderefc\.cm(\/|$)/i.test(process.env.NFCWEBSITE_API_URL?.trim() || '');

  try {
    siteApiUrl = getSiteApiUrl();
  } catch (err) {
    configValid = false;
    configError = err instanceof Error ? err.message : 'NFCWEBSITE_API_URL invalide.';
  }

  const probes: {
    health: { reachable: boolean; status: number | null; contentType: string | null; data: unknown };
    loginEndpoint: { reachable: boolean; status: number | null; isJson: boolean; redirected: boolean; detail: string };
    refreshEndpoint: { available: boolean; status: number | null; detail: string };
  } = {
    health: { reachable: false, status: null, contentType: null, data: null },
    loginEndpoint: { reachable: false, status: null, isJson: false, redirected: false, detail: 'Non testé' },
    refreshEndpoint: { available: false, status: null, detail: 'Non testé' },
  };

  if (configValid && siteApiUrl) {
    // 1. Sonde /api/health
    try {
      const healthRes = await fetch(`${siteApiUrl}/api/health`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(4_500),
      });
      const ct = healthRes.headers.get('content-type');
      probes.health = {
        reachable: true,
        status: healthRes.status,
        contentType: ct,
        data: ct?.includes('application/json') ? await healthRes.json().catch(() => null) : null,
      };
    } catch {
      probes.health = { reachable: false, status: null, contentType: null, data: null };
    }

    // 2. Sonde POST /api/auth/login (corps vide : attend 400 JSON si l'endpoint est sain, 500 HTML si JWT_SECRET manque)
    try {
      const loginRes = await fetch(`${siteApiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(4_500),
      });
      const redirected = loginRes.status >= 300 && loginRes.status < 400;
      const ct = loginRes.headers.get('content-type') || '';
      const isJson = ct.includes('application/json');
      let detail = 'OK (JSON 400 attendu sur corps vide)';
      if (redirected) detail = `Redirection ${loginRes.status} détectée (domaine nu → www).`;
      else if (!isJson && loginRes.status >= 500) {
        detail = 'Erreur HTML 500 : JWT_SECRET ou JWT_REFRESH_SECRET manque probablement sur nfcwebsite.';
      } else if (loginRes.status >= 500) {
        detail = 'Erreur serveur 500 JSON sur /api/auth/login.';
      }
      probes.loginEndpoint = {
        reachable: true,
        status: loginRes.status,
        isJson,
        redirected,
        detail,
      };
    } catch {
      probes.loginEndpoint = {
        reachable: false,
        status: null,
        isJson: false,
        redirected: false,
        detail: 'Impossible de joindre POST /api/auth/login.',
      };
    }

    // 3. Sonde POST /api/auth/refresh
    try {
      const refreshRes = await fetch(`${siteApiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(4_500),
      });
      const available = refreshRes.status !== 404 && refreshRes.status !== 405;
      probes.refreshEndpoint = {
        available,
        status: refreshRes.status,
        detail: available
          ? 'Route /api/auth/refresh active (rotation des jetons disponible).'
          : 'Route /api/auth/refresh absente côté site (404) : avertissement 2 min avant expiration actif.',
      };
    } catch {
      probes.refreshEndpoint = { available: false, status: null, detail: 'Sonde refresh injoignable.' };
    }
  }

  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  return NextResponse.json({
    status: 'ok',
    checkedAt: new Date().toISOString(),
    config: {
      rawEnvUrl,
      resolvedSiteApiUrl: siteApiUrl,
      wasNormalizedFromApex,
      configValid,
      configError,
    },
    requestContext: {
      protocol: request.nextUrl.protocol.replace(/:$/, ''),
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      origin: request.headers.get('origin'),
      secFetchSite: request.headers.get('sec-fetch-site'),
      secureCookieFlagUsed: isSecureRequest(request),
    },
    cookies: {
      hasAccessTokenCookie: Boolean(accessToken),
      hasRefreshTokenCookie: Boolean(refreshToken),
      sessionStatus: session.status,
      userRole: session.user?.role ?? null,
    },
    probes,
  });
}
