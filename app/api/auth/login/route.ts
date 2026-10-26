import { NextRequest, NextResponse } from 'next/server';
import { SITE_TOKEN_COOKIE, getSiteApiUrl, SiteUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Requête de connexion invalide.' }, { status: 400 });
  }

  let siteApiUrl: string;
  try {
    siteApiUrl = getSiteApiUrl();
  } catch (error) {
    console.error('Configuration de l’API nfcwebsite invalide:', error);
    return NextResponse.json({ message: 'Configuration de l’API nfcwebsite invalide.' }, { status: 500 });
  }

  let response: Response;
  try {
    response = await fetch(`${siteApiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch (error) {
    console.error('Impossible de joindre l’API d’authentification nfcwebsite:', error);
    return NextResponse.json({ message: 'Le service de connexion du site est indisponible.' }, { status: 502 });
  }

  if (response.status >= 300 && response.status < 400) {
    console.error(`L’API d’authentification nfcwebsite a redirigé la requête (${response.status}).`);
    return NextResponse.json(
      { message: 'L’API de connexion a redirigé la requête. Vérifiez son URL officielle.' },
      { status: 502 },
    );
  }

  let result: {
      message?: string;
      token?: string;
      user?: SiteUser;
    };
  try {
    result = await response.json();
  } catch (error) {
    console.error('Réponse JSON invalide de l’API d’authentification nfcwebsite:', error);
    return NextResponse.json({ message: 'Réponse de connexion du site invalide.' }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ message: result.message ?? 'Connexion refusée par le site.' }, { status: response.status });
  }
  if (!result.token || !result.user) {
    console.error('La route de connexion du site a renvoyé un format inattendu.');
    return NextResponse.json({ message: 'Réponse de connexion du site invalide.' }, { status: 502 });
  }
  if (result.user.role !== 'ADMIN' && result.user.role !== 'EDITOR') {
    return NextResponse.json({ message: 'Seuls les administrateurs et éditeurs peuvent utiliser l’administration.' }, { status: 403 });
  }

  const output = NextResponse.json({ user: result.user });
  output.cookies.set(SITE_TOKEN_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  return output;
}
