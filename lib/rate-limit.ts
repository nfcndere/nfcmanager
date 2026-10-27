import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type Bucket = { count: number; expiresAt: number };

const buckets = new Map<string, Bucket>();

export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

/**
 * Limitation de tentatives en mémoire côté manager (ex. 5 tentatives / 10 min par IP et par e-mail).
 * Renvoie une réponse 429 avec `Retry-After` si le quota est dépassé, sinon `null`.
 */
export function checkManagerRateLimit(
  scope: string,
  identifier: string,
  limit = 5,
  windowMs = 10 * 60 * 1_000,
  now = Date.now(),
): NextResponse | null {
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
  const key = `${scope}:${identifier.toLowerCase()}`;
  const existing = buckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return null;
  }
  existing.count += 1;
  if (existing.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((existing.expiresAt - now) / 1_000));
  return NextResponse.json(
    {
      status: 'error',
      message: `Trop de tentatives. Veuillez patienter ${retryAfter} s avant de réessayer.`,
      retryAfter,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

export function resetManagerRateLimits() {
  buckets.clear();
}

export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): { allowed: boolean; retryAfterSeconds: number } {
  const res = checkManagerRateLimit('test', key, limit, windowMs);
  if (!res) return { allowed: true, retryAfterSeconds: 0 };
  return {
    allowed: false,
    retryAfterSeconds: Number(res.headers.get('Retry-After') || 60),
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(`test:${key.toLowerCase()}`);
}
