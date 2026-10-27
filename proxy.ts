import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  SITE_EXP_COOKIE,
  SITE_REFRESH_COOKIE,
  SITE_TOKEN_COOKIE,
} from '@/lib/auth';

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const PUBLIC_PATHS = new Set([
  '/',
  '/connexion',
  '/mot-de-passe',
  '/mot-de-passe/oublie',
  '/mot-de-passe/reinitialiser',
  '/403',
  '/manifest.webmanifest',
]);

/**
 * Vérifie que la requête d'écriture provient bien de la même origine :
 * - compare `Origin` à `request.nextUrl.origin` OU à l'origine reconstruite via
 *   `X-Forwarded-Proto` + `X-Forwarded-Host` / `Host` (cas reverse proxy / Vercel / Nginx) ;
 * - si le navigateur n'envoie pas d'en-tête `Origin` (PWA standalone, Safari iOS, même origine),
 *   accepte `Sec-Fetch-Site: same-origin` ou `same-site` lorsque `Host` est présent ;
 * - rejette toute origine tierce explicite (`403`).
 */
export function isTrustedOrigin(request: NextRequest): boolean {
  const originHeader = request.headers.get('origin');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host')?.trim() || request.nextUrl.host;
  const proto = forwardedProto || request.nextUrl.protocol.replace(/:$/, '') || 'https';

  const expectedOrigins = new Set<string>([
    request.nextUrl.origin,
    `${proto}://${host}`,
    `https://${host}`,
    `http://${host}`,
  ]);

  if (originHeader && originHeader !== 'null') {
    try {
      const parsedOrigin = new URL(originHeader).origin;
      return expectedOrigins.has(parsedOrigin);
    } catch {
      return false;
    }
  }

  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'same-origin') return true;
  if (secFetchSite === 'cross-site') return false;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return expectedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Requête directe sans Origin ni Referer ni Sec-Fetch-Site cross-site (ex. WebView iOS / test local).
  return !originHeader;
}

function isTokenExpiredOrNearExpiry(token: string | undefined, bufferSeconds = 60): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1_000 <= Date.now() + bufferSeconds * 1_000;
  } catch {
    return true;
  }
}

function getCanonicalSiteUrl(): string {
  const raw = process.env.NFCWEBSITE_API_URL?.trim() || 'https://www.ngaounderefc.cm';
  try {
    const url = new URL(raw);
    if (url.hostname === 'ngaounderefc.cm') url.hostname = 'www.ngaounderefc.cm';
    return url.toString().replace(/\/$/, '');
  } catch {
    return 'https://www.ngaounderefc.cm';
  }
}

function isHttps(request: NextRequest): boolean {
  if (process.env.FORCE_SECURE_COOKIES === 'true') return true;
  if (process.env.FORCE_SECURE_COOKIES === 'false') return false;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (proto) return proto === 'https';
  return request.nextUrl.protocol === 'https:';
}

export async function proxy(request: NextRequest) {
  if (mutationMethods.has(request.method)) {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { status: 'error', message: 'Origine de requête refusée.' },
        { status: 403 },
      );
    }
  }

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicPage =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/screenshots/') ||
    pathname === '/_design';

  let accessToken = request.cookies.get(SITE_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(SITE_REFRESH_COOKIE)?.value;
  let refreshedTokens: { token: string; refreshToken: string; expiresIn?: number } | null = null;

  // Renouvellement transparent du jeton d'accès si expiré (ou à < 60 s de l'expiration) et qu'un refreshToken existe.
  if (refreshToken && isTokenExpiredOrNearExpiry(accessToken, 60) && !pathname.startsWith('/api/auth/')) {
    try {
      const refreshRes = await fetch(`${getCanonicalSiteUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(4_000),
      });
      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as { token?: string; refreshToken?: string; expiresIn?: number };
        if (data.token) {
          accessToken = data.token;
          refreshedTokens = {
            token: data.token,
            refreshToken: data.refreshToken ?? refreshToken,
            expiresIn: data.expiresIn,
          };
        }
      } else if (refreshRes.status === 401 || refreshRes.status === 403) {
        if (!isApiRoute && !isPublicPage) {
          const loginUrl = new URL('/connexion', request.url);
          loginUrl.searchParams.set('expired', '1');
          loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
          const redirectRes = NextResponse.redirect(loginUrl);
          redirectRes.cookies.delete(SITE_TOKEN_COOKIE);
          redirectRes.cookies.delete(SITE_REFRESH_COOKIE);
          redirectRes.cookies.delete(SITE_EXP_COOKIE);
          return redirectRes;
        }
      }
    } catch {
      // Réseau indisponible : on ne déconnecte pas l'utilisateur, la page passera en mode hors ligne / dégradé.
    }
  }

  // Garde des routes protégées : aucun cookie d'accès ni de refresh → redirection vers /connexion.
  if (!isApiRoute && !isPublicPage && !accessToken && !refreshToken) {
    const loginUrl = new URL('/connexion', request.url);
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  if (refreshedTokens) {
    // Met à jour l'en-tête Cookie transmis aux Server Components / Route Handlers de cette même requête.
    const cookiePairs = request.cookies
      .getAll()
      .filter((c) => c.name !== SITE_TOKEN_COOKIE && c.name !== SITE_REFRESH_COOKIE)
      .map((c) => `${c.name}=${c.value}`);
    cookiePairs.push(`${SITE_TOKEN_COOKIE}=${refreshedTokens.token}`);
    cookiePairs.push(`${SITE_REFRESH_COOKIE}=${refreshedTokens.refreshToken}`);
    requestHeaders.set('cookie', cookiePairs.join('; '));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (refreshedTokens) {
    const secure = isHttps(request);
    const maxAge = refreshedTokens.expiresIn ?? ACCESS_TOKEN_MAX_AGE;
    response.cookies.set(SITE_TOKEN_COOKIE, refreshedTokens.token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    response.cookies.set(SITE_REFRESH_COOKIE, refreshedTokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    response.cookies.set(SITE_EXP_COOKIE, String(Date.now() + maxAge * 1_000), {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  const scriptPolicy =
    process.env.NODE_ENV === 'development'
      ? "'self' 'unsafe-inline' 'unsafe-eval'"
      : "'self' 'unsafe-inline'";
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src ${scriptPolicy}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://api.dicebear.com",
      "media-src 'self' blob: https://res.cloudinary.com",
      "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  );
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html).*)'],
};
