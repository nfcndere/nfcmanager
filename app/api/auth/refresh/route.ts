import { NextRequest, NextResponse } from 'next/server';
import { applySessionCookies, clearSessionCookies, getRefreshToken, refreshWithSite } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json(
      { status: 'error', code: 'NO_REFRESH_TOKEN', message: 'Aucun jeton de renouvellement.' },
      { status: 401 },
    );
  }

  const refreshed = await refreshWithSite(refreshToken);
  if (refreshed.status === 'unsupported') {
    return NextResponse.json(
      {
        status: 'error',
        code: 'FEATURE_UNAVAILABLE',
        message: 'Le renouvellement automatique n’est pas encore activé côté site.',
      },
      { status: 404 },
    );
  }
  if (refreshed.status === 'invalid') {
    const out = NextResponse.json(
      { status: 'error', code: 'SESSION_EXPIRED', message: 'Session expirée, reconnectez-vous.' },
      { status: 401 },
    );
    clearSessionCookies(out, request);
    return out;
  }
  if (refreshed.status !== 'ok') {
    return NextResponse.json(
      { status: 'error', code: 'SITE_UNAVAILABLE', message: 'Service du site momentanément indisponible.' },
      { status: 502 },
    );
  }

  const response = NextResponse.json({
    status: 'ok',
    user: refreshed.user ?? null,
    expiresIn: refreshed.expiresIn ?? 15 * 60,
  });
  applySessionCookies(
    response,
    {
      token: refreshed.token,
      refreshToken: refreshed.refreshToken,
      expiresIn: refreshed.expiresIn,
    },
    request,
  );
  return response;
}
