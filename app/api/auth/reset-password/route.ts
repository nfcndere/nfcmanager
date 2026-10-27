import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSiteApiUrl } from '@/lib/auth';
import { checkManagerRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  token: z.string().trim().min(10, 'Jeton de réinitialisation invalide.'),
  password: z
    .string()
    .min(10, 'Le mot de passe doit contenir au moins 10 caractères.')
    .max(128)
    .refine((val) => /[A-Za-zÀ-ÿ]/.test(val) && /\d/.test(val), {
      message: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
    }),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: 'Requête invalide.' }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'error', message: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 },
    );
  }

  const limited = checkManagerRateLimit('reset', getClientIp(request), 5, 15 * 60 * 1_000);
  if (limited) return limited;

  try {
    const upstream = await fetch(`${getSiteApiUrl()}/api/auth/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
          message: 'La réinitialisation de mot de passe n’est pas encore disponible côté site.',
        },
        { status: 404 },
      );
    }

    const payload = (await upstream.json().catch(() => ({}))) as { message?: string };
    return NextResponse.json(
      {
        status: upstream.ok ? 'ok' : 'error',
        message:
          payload.message ||
          (upstream.ok ? 'Mot de passe réinitialisé. Vous pouvez vous connecter.' : 'Lien invalide ou expiré.'),
      },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Service du site indisponible. Vérifiez votre connexion.' },
      { status: 502 },
    );
  }
}
