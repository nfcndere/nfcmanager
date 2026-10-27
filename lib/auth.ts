import { cache } from 'react';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

export const SITE_TOKEN_COOKIE = 'nfcwebsite_access_token';
export const SITE_REFRESH_COOKIE = 'nfcwebsite_refresh_token';
export const SITE_EXP_COOKIE = 'nfcwebsite_session_exp';

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

const DEFAULT_SITE_API_URL = 'https://www.ngaounderefc.cm';
const SESSION_TIMEOUT_MS = 5_000;
const SESSION_CACHE_TTL_MS = 60_000;

export type SiteUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
  mustChangePassword?: boolean;
};

export type SessionUser = SiteUser;

export type SessionResult =
  | { status: 'ok' | 'authenticated'; user: SiteUser; expiresAt: number | null; hasRefreshToken: boolean }
  | { status: 'unauthenticated'; user: null; expiresAt: null; hasRefreshToken: boolean }
  | { status: 'unavailable' | 'api_unavailable'; user: SiteUser | null; expiresAt: number | null; hasRefreshToken: boolean };

const verifiedTokenCache = new Map<string, { user: SiteUser; cachedAt: number }>();

export function getSiteApiUrl() {
  const value = process.env.NFCWEBSITE_API_URL?.trim() || DEFAULT_SITE_API_URL;
  const url = new URL(value);
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.search || url.hash) {
    throw new Error('NFCWEBSITE_API_URL doit être une URL HTTP(S) sans identifiants ni paramètres.');
  }
  if (url.hostname === 'ngaounderefc.cm') {
    url.hostname = 'www.ngaounderefc.cm';
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production' && process.env.ALLOW_HTTP_SITE_API !== 'true') {
    throw new Error('NFCWEBSITE_API_URL doit utiliser HTTPS en production.');
  }
  return url.toString().replace(/\/$/, '');
}

/**
 * Détermine si la requête courante est servie en HTTPS (directement ou derrière un reverse proxy).
 * Permet de tester la build de production sur un téléphone en `http://192.168.x.x` sans que le
 * navigateur rejette le cookie `Secure`, tout en gardant `Secure` sur HTTPS en production.
 */
export function isSecureRequest(request?: NextRequest | Request | null): boolean {
  if (process.env.FORCE_SECURE_COOKIES === 'true') return true;
  if (process.env.FORCE_SECURE_COOKIES === 'false') return false;
  if (!request) return process.env.NODE_ENV === 'production';

  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto) return forwardedProto === 'https';

  try {
    const url = 'nextUrl' in request ? request.nextUrl : new URL(request.url);
    return url.protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

/** Décode la charge utile d'un JWT sans secret (pour lire `exp`, `sub`, `email`, `role`). */
export function decodeJwtPayload(token: string): {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenExpiresAtMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1_000 : null;
}

export function applySessionCookies(
  response: NextResponse,
  tokens: { token: string; refreshToken?: string | null; expiresIn?: number },
  request?: NextRequest | Request | null,
) {
  const secure = isSecureRequest(request);
  const maxAge = tokens.expiresIn ?? ACCESS_TOKEN_MAX_AGE;
  const expiresAtMs = getTokenExpiresAtMs(tokens.token) ?? Date.now() + maxAge * 1_000;

  response.cookies.set(SITE_TOKEN_COOKIE, tokens.token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  if (tokens.refreshToken) {
    response.cookies.set(SITE_REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
  // Cookie lisible par le client uniquement pour afficher le compte à rebours d'expiration (aucun secret).
  response.cookies.set(SITE_EXP_COOKIE, String(expiresAtMs), {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.refreshToken ? REFRESH_TOKEN_MAX_AGE : maxAge,
  });
}

export function clearSessionCookies(response: NextResponse, request?: NextRequest | Request | null) {
  const secure = isSecureRequest(request);
  for (const name of [SITE_TOKEN_COOKIE, SITE_REFRESH_COOKIE, SITE_EXP_COOKIE]) {
    response.cookies.set(name, '', {
      httpOnly: name !== SITE_EXP_COOKIE,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
}

export async function getAccessToken() {
  return (await cookies()).get(SITE_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  return (await cookies()).get(SITE_REFRESH_COOKIE)?.value ?? null;
}

/**
 * Appelle `POST /api/auth/refresh` sur nfcwebsite.
 * Retourne `{ status: 'ok', token, refreshToken, user }`, `{ status: 'unsupported' }` (404/405),
 * `{ status: 'invalid' }` (401/403) ou `{ status: 'unavailable' }` (réseau/5xx).
 */
export async function refreshWithSite(refreshToken: string): Promise<
  | { status: 'ok'; token: string; refreshToken: string; expiresIn?: number; user?: SiteUser }
  | { status: 'unsupported' | 'invalid' | 'unavailable' }
> {
  try {
    const response = await fetch(`${getSiteApiUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
    if (response.status === 404 || response.status === 405) return { status: 'unsupported' };
    if (response.status === 401 || response.status === 403) return { status: 'invalid' };
    if (!response.ok) return { status: 'unavailable' };
    const data = (await response.json()) as {
      token?: string;
      refreshToken?: string;
      expiresIn?: number;
      user?: SiteUser;
    };
    if (!data.token) return { status: 'unavailable' };
    return {
      status: 'ok',
      token: data.token,
      refreshToken: data.refreshToken ?? refreshToken,
      expiresIn: data.expiresIn,
      user: data.user,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * Vérifie la session courante auprès de `GET /api/auth/me` avec :
 * - mémoïsation `React.cache` par rendu serveur ;
 * - cache mémoire court (60 s) par jeton pour éviter de solliciter `/api/auth/me` à chaque clic ;
 * - délai maximal de 5 s ;
 * - aucune exception levée en cas de panne du site (`status: 'unavailable'`).
 */
export const getSessionState = cache(async (): Promise<SessionResult> => {
  const store = await cookies();
  const token = store.get(SITE_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = store.get(SITE_REFRESH_COOKIE)?.value ?? null;
  const hasRefreshToken = Boolean(refreshToken);

  if (!token) {
    return { status: 'unauthenticated', user: null, expiresAt: null, hasRefreshToken };
  }

  const expiresAt = getTokenExpiresAtMs(token);
  if (expiresAt && expiresAt <= Date.now()) {
    verifiedTokenCache.delete(token);
    return { status: 'unauthenticated', user: null, expiresAt: null, hasRefreshToken };
  }

  const cached = verifiedTokenCache.get(token);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return { status: 'ok', user: cached.user, expiresAt, hasRefreshToken };
  }

  try {
    const response = await fetch(`${getSiteApiUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) {
      verifiedTokenCache.delete(token);
      return { status: 'unauthenticated', user: null, expiresAt: null, hasRefreshToken };
    }
    if (!response.ok) {
      const fallbackPayload = decodeJwtPayload(token);
      const fallbackUser =
        fallbackPayload?.sub && (fallbackPayload.role === 'ADMIN' || fallbackPayload.role === 'EDITOR')
          ? ({
              id: fallbackPayload.sub,
              name: fallbackPayload.name || fallbackPayload.email?.split('@')[0] || ' Éditeur',
              email: fallbackPayload.email || '',
              role: fallbackPayload.role,
            } satisfies SiteUser)
          : null;
      return { status: 'unavailable', user: fallbackUser, expiresAt, hasRefreshToken };
    }
    const result = (await response.json()) as { data?: SiteUser };
    const user = result.data;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
      return { status: 'unauthenticated', user: null, expiresAt: null, hasRefreshToken };
    }
    verifiedTokenCache.set(token, { user, cachedAt: Date.now() });
    return { status: 'ok', user, expiresAt, hasRefreshToken };
  } catch {
    const fallbackPayload = decodeJwtPayload(token);
    const fallbackUser =
      fallbackPayload?.sub && (fallbackPayload.role === 'ADMIN' || fallbackPayload.role === 'EDITOR')
        ? ({
            id: fallbackPayload.sub,
            name: fallbackPayload.name || fallbackPayload.email?.split('@')[0] || 'Éditeur',
            email: fallbackPayload.email || '',
            role: fallbackPayload.role,
          } satisfies SiteUser)
        : null;
    return { status: 'unavailable', user: fallbackUser, expiresAt, hasRefreshToken };
  }
});

/** Compatibilité : renvoie `SiteUser | null` sans jamais lever d'exception. */
export async function getSession(): Promise<SiteUser | null> {
  const state = await getSessionState();
  return state.user;
}
