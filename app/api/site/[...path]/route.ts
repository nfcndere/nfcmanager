import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, getSiteApiUrl } from '@/lib/auth';

type Context = { params: Promise<{ path: string[] }> };

const routeMethods: { pattern: RegExp; methods: readonly string[] }[] = [
  { pattern: /^\/matches$/, methods: ['GET', 'POST'] },
  { pattern: /^\/matches\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/players$/, methods: ['GET', 'POST'] },
  { pattern: /^\/players\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/articles$/, methods: ['GET', 'POST'] },
  { pattern: /^\/articles\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/galerie$/, methods: ['GET', 'POST'] },
  { pattern: /^\/galerie\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/uploads$/, methods: ['POST'] },
  { pattern: /^\/forms$/, methods: ['GET'] },
  { pattern: /^\/forms\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/academie$/, methods: ['GET', 'POST'] },
  { pattern: /^\/newsletter$/, methods: ['GET', 'POST'] },
  { pattern: /^\/emails$/, methods: ['GET', 'POST'] },
  { pattern: /^\/partners$/, methods: ['GET'] },
  { pattern: /^\/standings$/, methods: ['GET'] },
  { pattern: /^\/seasons$/, methods: ['GET', 'POST'] },
  { pattern: /^\/club-overview$/, methods: ['GET'] },
];

async function proxy(request: NextRequest, context: Context) {
  const { path: segments } = await context.params;
  if (!segments?.length || segments.some((segment) => segment === '.' || segment === '..' || segment.includes('/'))) {
    return NextResponse.json({ message: 'Route API invalide.' }, { status: 400 });
  }
  const apiPath = `/${segments.join('/')}`;
  const route = routeMethods.find(({ pattern }) => pattern.test(apiPath));
  if (!route) return NextResponse.json({ message: 'Cette route n’est pas disponible dans le proxy.' }, { status: 404 });
  if (!route.methods.includes(request.method)) {
    return NextResponse.json({ message: `Méthode ${request.method} non disponible pour cette route.` }, { status: 405 });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(`${getSiteApiUrl()}/api/${segments.map(encodeURIComponent).join('/')}`);
  } catch (error) {
    console.error('URL de l’API nfcwebsite invalide:', error);
    return NextResponse.json({ message: 'Configuration de l’API nfcwebsite invalide.' }, { status: 500 });
  }
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Accept', 'application/json');
  const token = await getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return NextResponse.json({ message: 'Redirection inattendue de l’API nfcwebsite.' }, { status: 502 });
    }
    const responseHeaders = new Headers();
    const responseType = upstream.headers.get('content-type');
    if (responseType) responseHeaders.set('Content-Type', responseType);
    responseHeaders.set('Cache-Control', 'no-store');
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error(`Échec du proxy vers /api${apiPath}:`, error);
    return NextResponse.json({ message: 'Impossible de joindre l’API nfcwebsite.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
