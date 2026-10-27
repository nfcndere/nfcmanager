import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applySessionCookies, getSiteApiUrl, SiteUser } from '@/lib/auth';
import { checkManagerRateLimit, getClientIp } from '@/lib/rate-limit';

const loginInputSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Mot de passe obligatoire.').max(256),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Requête de connexion invalide.' }, { status: 400 });
  }

  const parsed = loginInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'error', message: parsed.error.issues[0]?.message ?? 'Email et mot de passe valides obligatoires.' },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  // Limitation de tentatives côté manager (5 tentatives / 10 min par IP et par e-mail).
  const ip = getClientIp(request);
  const ipLimited = checkManagerRateLimit('login-ip', ip, 10, 10 * 60 * 1_000);
  if (ipLimited) return ipLimited;
  const emailLimited = checkManagerRateLimit('login-email', email, 5, 10 * 60 * 1_000);
  if (emailLimited) return emailLimited;

  let siteApiUrl: string;
  try {
    siteApiUrl = getSiteApiUrl();
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Configuration de l’API nfcwebsite invalide (vérifiez NFCWEBSITE_API_URL).' },
      { status: 500 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${siteApiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password, scope: 'admin' }),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Réseau indisponible ou serveur du site injoignable. Vérifiez votre connexion.' },
      { status: 502 },
    );
  }

  if (response.status >= 300 && response.status < 400) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'L’API du site a redirigé la requête (domaine nu vers www). Utilisez https://www.ngaounderefc.cm.',
      },
      { status: 502 },
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (response.status >= 500) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Le site renvoie une erreur serveur (500). Vérifiez le déploiement du site et ses variables JWT_SECRET / JWT_REFRESH_SECRET.',
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { status: 'error', message: `Réponse inattendue du site (statut ${response.status}).` },
      { status: 502 },
    );
  }

  let result: {
    message?: string;
    token?: string;
    refreshToken?: string;
    expiresIn?: number;
    user?: SiteUser & { role?: string };
  };
  try {
    result = await response.json();
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Le site renvoie une erreur serveur (500). Vérifiez le déploiement du site.',
      },
      { status: 502 },
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      return NextResponse.json({ status: 'error', message: 'Identifiants incorrects.' }, { status: 401 });
    }
    if (response.status === 403) {
      return NextResponse.json(
        { status: 'error', message: result.message || 'Compte sans droits d’administration.' },
        { status: 403 },
      );
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const headers = retryAfter ? { 'Retry-After': retryAfter } : undefined;
      return NextResponse.json(
        { status: 'error', message: result.message || 'Trop de tentatives de connexion. Réessayez plus tard.' },
        { status: 429, headers },
      );
    }
    if (response.status >= 500) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            result.message || 'Le site renvoie une erreur serveur (500). Vérifiez le déploiement du site.',
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { status: 'error', message: result.message ?? 'Connexion refusée par le site.' },
      { status: response.status },
    );
  }

  if (!result.token || !result.user) {
    return NextResponse.json(
      { status: 'error', message: 'Réponse de connexion du site incomplète (jeton manquant).' },
      { status: 502 },
    );
  }
  if (result.user.role !== 'ADMIN' && result.user.role !== 'EDITOR') {
    return NextResponse.json(
      { status: 'error', message: 'Compte sans droits d’administration.' },
      { status: 403 },
    );
  }

  const output = NextResponse.json({
    status: 'ok',
    user: result.user,
    hasRefreshToken: Boolean(result.refreshToken),
    expiresIn: result.expiresIn ?? 15 * 60,
  });
  applySessionCookies(
    output,
    {
      token: result.token,
      refreshToken: result.refreshToken ?? null,
      expiresIn: result.expiresIn,
    },
    request,
  );
  return output;
}
