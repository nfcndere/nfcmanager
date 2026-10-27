import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applySessionCookies, getAccessToken, getSiteApiUrl } from '@/lib/auth';

const schema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel obligatoire.'),
  newPassword: z
    .string()
    .min(10, 'Le nouveau mot de passe doit contenir au moins 10 caractères.')
    .max(128)
    .refine((val) => /[A-Za-zÀ-ÿ]/.test(val) && /\d/.test(val), {
      message: 'Le nouveau mot de passe doit contenir au moins une lettre et un chiffre.',
    }),
});

export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ status: 'error', message: 'Session expirée.' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Requête invalide.' }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'error', message: parsed.error.issues[0]?.message ?? 'Mot de passe invalide.' },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${getSiteApiUrl()}/api/auth/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });

    if (upstream.status === 404 || upstream.status === 405) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'FEATURE_UNAVAILABLE',
          message: 'Le changement de mot de passe n’est pas encore disponible côté site.',
        },
        { status: 404 },
      );
    }

    const payload = (await upstream.json().catch(() => ({}))) as {
      message?: string;
      token?: string;
      refreshToken?: string;
      expiresIn?: number;
      user?: unknown;
    };

    if (!upstream.ok) {
      return NextResponse.json(
        { status: 'error', message: payload.message || 'Impossible de modifier le mot de passe.' },
        { status: upstream.status },
      );
    }

    const out = NextResponse.json({
      status: 'ok',
      message: payload.message || 'Mot de passe modifié avec succès.',
      user: payload.user,
    });
    if (payload.token) {
      applySessionCookies(
        out,
        { token: payload.token, refreshToken: payload.refreshToken, expiresIn: payload.expiresIn },
        request,
      );
    }
    return out;
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Service du site indisponible.' },
      { status: 502 },
    );
  }
}
