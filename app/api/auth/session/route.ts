import { NextRequest, NextResponse } from 'next/server';
import { applySessionCookies, getRefreshToken, getSessionState, refreshWithSite } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const state = await getSessionState();
  if (state.status === 'ok') {
    return NextResponse.json({
      status: 'ok',
      user: state.user,
      expiresAt: state.expiresAt,
      hasRefreshToken: state.hasRefreshToken,
    });
  }

  if (state.status === 'unauthenticated' && state.hasRefreshToken) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      const refreshed = await refreshWithSite(refreshToken);
      if (refreshed.status === 'ok' && refreshed.user) {
        const out = NextResponse.json({
          status: 'ok',
          user: refreshed.user,
          expiresAt: Date.now() + (refreshed.expiresIn ?? 15 * 60) * 1_000,
          hasRefreshToken: true,
        });
        applySessionCookies(
          out,
          { token: refreshed.token, refreshToken: refreshed.refreshToken, expiresIn: refreshed.expiresIn },
          request,
        );
        return out;
      }
    }
  }

  if (state.status === 'unavailable') {
    return NextResponse.json(
      {
        status: 'unavailable',
        user: state.user,
        expiresAt: state.expiresAt,
        hasRefreshToken: state.hasRefreshToken,
        message: 'Service du site indisponible.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: 'unauthenticated', message: 'Session expirée.' }, { status: 401 });
}
