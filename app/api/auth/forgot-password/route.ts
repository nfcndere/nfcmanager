import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSiteApiUrl } from '@/lib/auth';
import { checkManagerRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').transform((e) => e.toLowerCase()),
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
    return NextResponse.json({ status: 'error', message: 'Adresse e-mail invalide.' }, { status: 400 });
  }

  const limited = checkManagerRateLimit('forgot', `${getClientIp(request)}:${parsed.data.email}`, 4, 15 * 60 * 1_000);
  if (limited) return limited;

  try {
    const upstream = await fetch(`${getSiteApiUrl()}/api/auth/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: parsed.data.email }),
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
          (upstream.ok
            ? 'Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d’être envoyé.'
            : 'Impossible d’envoyer le lien de réinitialisation.'),
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
