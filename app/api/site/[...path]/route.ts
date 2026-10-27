import { NextRequest, NextResponse } from 'next/server';
import { applySessionCookies, getAccessToken, getRefreshToken, getSiteApiUrl, refreshWithSite } from '@/lib/auth';
import { matchProxyRoute } from '@/lib/proxy-routes';

type Context = { params: Promise<{ path: string[] }> };

const MAX_JSON_BODY_BYTES = 1_048_576; // 1 Mio
const MAX_UPLOAD_BODY_BYTES = 4_194_304; // 4 Mio (voie de secours multipart sous la limite Vercel 4,5 Mo)

async function proxy(request: NextRequest, context: Context) {
  const { path: segments } = await context.params;
  if (!segments?.length || segments.some((segment) => segment === '.' || segment === '..' || segment.includes('/'))) {
    return NextResponse.json({ status: 'error', message: 'Route API invalide.' }, { status: 400 });
  }
  const apiPath = `/${segments.join('/')}`;
  const match = matchProxyRoute(apiPath, request.method);
  if (match.status === 'not_found') {
    return NextResponse.json({ status: 'error', message: 'Cette route n’est pas disponible dans le proxy.' }, { status: 404 });
  }
  if (match.status === 'method_not_allowed') {
    return NextResponse.json(
      { status: 'error', message: `Méthode ${request.method} non disponible pour cette route.` },
      { status: 405 },
    );
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(`${getSiteApiUrl()}/api/${segments.map(encodeURIComponent).join('/')}`);
  } catch {
    return NextResponse.json({ status: 'error', message: 'Configuration de l’API nfcwebsite invalide.' }, { status: 500 });
  }
  upstreamUrl.search = request.nextUrl.search;

  const isBodyMethod = request.method !== 'GET' && request.method !== 'HEAD';
  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.toLowerCase().startsWith('multipart/form-data');

  let bodyBuffer: ArrayBuffer | undefined;
  if (isBodyMethod) {
    if (apiPath === '/uploads') {
      if (!isMultipart) {
        return NextResponse.json({ status: 'error', message: 'Format multipart/form-data attendu.' }, { status: 415 });
      }
    } else if (contentType && !contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ status: 'error', message: 'Content-Type application/json attendu.' }, { status: 415 });
    }
    bodyBuffer = await request.arrayBuffer();
    const maxBytes = apiPath === '/uploads' ? MAX_UPLOAD_BODY_BYTES : MAX_JSON_BODY_BYTES;
    if (bodyBuffer.byteLength > maxBytes) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            apiPath === '/uploads'
              ? 'Fichier trop volumineux pour le relais serveur (limite 4 Mo). Utilisez l’envoi direct Cloudinary.'
              : 'Corps de requête trop volumineux.',
        },
        { status: 413 },
      );
    }
  }

  const headerAuth = request.headers.get('authorization');
  const bearerFromHeader =
    headerAuth && headerAuth.toLowerCase().startsWith('bearer ')
      ? headerAuth.slice(7).trim()
      : null;
  let token = (await getAccessToken()) || bearerFromHeader;
  let refreshedTokens: { token: string; refreshToken: string; expiresIn?: number } | null = null;

  const callUpstream = async (bearer: string | null) => {
    const headers = new Headers();
    if (contentType) headers.set('Content-Type', contentType);
    headers.set('Accept', 'application/json');
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    return fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: bodyBuffer,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
  };

  try {
    let upstream = await callUpstream(token);

    // Si le jeton d'accès vient d'expirer (401), tente une rotation transparente via le refreshToken.
    if (upstream.status === 401) {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        const refreshed = await refreshWithSite(refreshToken);
        if (refreshed.status === 'ok') {
          token = refreshed.token;
          refreshedTokens = {
            token: refreshed.token,
            refreshToken: refreshed.refreshToken,
            expiresIn: refreshed.expiresIn,
          };
          upstream = await callUpstream(token);
        }
      }
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      return NextResponse.json({ status: 'error', message: 'Redirection inattendue de l’API nfcwebsite.' }, { status: 502 });
    }

    const responseHeaders = new Headers();
    const responseType = upstream.headers.get('content-type');
    if (responseType) responseHeaders.set('Content-Type', responseType);
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('Retry-After', retryAfter);
    responseHeaders.set('Cache-Control', 'no-store');

    const out = new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
    if (refreshedTokens) {
      applySessionCookies(out, refreshedTokens, request);
    }
    return out;
  } catch {
    return NextResponse.json({ status: 'error', message: 'Impossible de joindre l’API nfcwebsite.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
